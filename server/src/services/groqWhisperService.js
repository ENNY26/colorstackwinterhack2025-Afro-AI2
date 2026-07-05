const OpenAI = require('openai');
const fs = require('fs');

/**
 * Groq speech-to-text. Groq exposes an OpenAI-compatible API, so we reuse the
 * OpenAI SDK pointed at Groq's base URL. Groq's Whisper is free (generous limits)
 * and very fast, which makes it a great primary STT provider.
 *
 * Configure with:
 *   GROQ_API_KEY=gsk_...
 *   GROQ_WHISPER_MODEL=whisper-large-v3-turbo (default)
 */
const languageMap = {
  yoruba: 'yo',
  swahili: 'sw',
  hausa: 'ha',
  zulu: 'zu',
  amharic: 'am',
  igbo: 'ig',
  xhosa: 'xh',
  akan: 'ak',
};

let client = null;
function getClient() {
  if (!process.env.GROQ_API_KEY) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
      timeout: parseInt(process.env.GROQ_WHISPER_TIMEOUT_MS, 10) || 25000,
      maxRetries: 0,
    });
  }
  return client;
}

function isConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
}

/**
 * Transcribe an audio file with Groq Whisper.
 * @param {string} audioFilePath
 * @param {string|null} language
 * @returns {Promise<{text: string, language: string}>}
 */
const transcribeAudio = async (audioFilePath, language = null) => {
  const groq = getClient();
  if (!groq) throw new Error('GROQ_API_KEY is not set');

  const model = process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3-turbo';
  const whisperLanguage = language ? languageMap[language] : null;

  const options = {
    file: fs.createReadStream(audioFilePath),
    model,
    response_format: 'json',
  };
  if (whisperLanguage) {
    options.language = whisperLanguage;
  }

  const response = await groq.audio.transcriptions.create(options);
  return {
    text: response.text,
    language: language || 'detected',
  };
};

module.exports = {
  transcribeAudio,
  isConfigured,
};
