const whisperService = require('./whisperService');
const groqWhisperService = require('./groqWhisperService');
const { forwardTranscribe } = require('./speechServiceClient');

/**
 * TRANSCRIBE_PROVIDER (default groq_first):
 *   - groq_first: Groq Whisper, then local FastAPI, then OpenAI
 *   - local_first: FastAPI Whisper, then OpenAI
 *   - openai_first: OpenAI, then local
 *   - groq / local / openai: single provider
 *
 * Whichever order is chosen, providers without credentials are skipped, so a
 * single exhausted/missing key never blocks the others.
 */
async function transcribeWithProviders(filePath, languageHint) {
  const hasGroq = groqWhisperService.isConfigured();
  const defaultProvider = hasGroq ? 'groq_first' : 'local_first';
  const raw = (process.env.TRANSCRIBE_PROVIDER || defaultProvider)
    .toLowerCase()
    .replace(/-/g, '_');
  const disableLocal = process.env.DISABLE_LOCAL_TRANSCRIBE === '1';
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

  const tryLocal = async () => {
    const r = await forwardTranscribe(filePath);
    const t = String(r.text || '').trim();
    if (!t) return null;
    return { text: r.text, language: r.language };
  };

  const tryOpenAI = async () => {
    if (!hasOpenAI) throw new Error('OPENAI_API_KEY is not set');
    const r = await whisperService.transcribeAudio(filePath, languageHint);
    const t = String(r.text || '').trim();
    if (!t) return null;
    return { text: r.text, language: r.language };
  };

  const tryGroq = async () => {
    const r = await groqWhisperService.transcribeAudio(filePath, languageHint);
    const t = String(r.text || '').trim();
    if (!t) return null;
    return { text: r.text, language: r.language };
  };

  const groqStep = { name: 'Groq Whisper', fn: tryGroq };
  const localStep = { name: 'local Whisper', fn: tryLocal };
  const openaiStep = { name: 'OpenAI', fn: tryOpenAI };

  let steps = [];
  switch (raw) {
    case 'groq':
      if (hasGroq) steps.push(groqStep);
      break;
    case 'groq_first':
      if (hasGroq) steps.push(groqStep);
      if (!disableLocal) steps.push(localStep);
      if (hasOpenAI) steps.push(openaiStep);
      break;
    case 'openai_first':
      if (hasOpenAI) steps.push(openaiStep);
      if (!disableLocal) steps.push(localStep);
      if (hasGroq) steps.push(groqStep);
      break;
    case 'local':
      if (!disableLocal) steps.push(localStep);
      break;
    case 'openai':
      if (hasOpenAI) steps.push(openaiStep);
      break;
    case 'local_first':
    default:
      if (hasGroq) steps.push(groqStep);
      if (!disableLocal) steps.push(localStep);
      if (hasOpenAI) steps.push(openaiStep);
      break;
  }

  if (!steps.length) {
    throw new Error('No transcription provider available');
  }

  let lastErr = null;
  for (const { name, fn } of steps) {
    try {
      const out = await fn();
      if (out) return out;
    } catch (e) {
      console.warn(`[transcribe] ${name} failed:`, e.message);
      lastErr = e;
    }
  }

  if (lastErr) throw lastErr;
  throw new Error('Transcription returned empty text from all providers');
}

module.exports = { transcribeWithProviders };
