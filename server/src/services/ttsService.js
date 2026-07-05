const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const elevenLabsService = require('./elevenLabsService');
const azureTtsService = require('./azureTtsService');

/**
 * TTS router: picks the cheapest provider that speaks each language well,
 * caches generated audio (so repeated greetings/phrases cost $0), and returns
 * `audioUrl: null` when no cloud provider fits so the client falls back to
 * free on-device TTS.
 *
 * Cost strategy:
 *   - Azure Neural (cheap) for well-supported languages (Swahili, Zulu, ...)
 *   - ElevenLabs (best quality) for Yoruba / Igbo / Akan
 *   - Device TTS (free) as the final fallback
 *
 * Override routing per language with TTS_ROUTE_<LANG> (e.g. TTS_ROUTE_SWAHILI=elevenlabs).
 */

const AUDIO_DIR = process.env.AUDIO_UPLOAD_DIR || './uploads/audio';

const DEFAULT_ROUTES = {
  yoruba: 'elevenlabs',
  igbo: 'elevenlabs',
  akan: 'elevenlabs',
  hausa: 'elevenlabs',
  swahili: 'azure',
  zulu: 'azure',
  amharic: 'azure',
  xhosa: 'azure',
  somali: 'azure',
};

const cachingEnabled = () => process.env.TTS_CACHE !== 'false';

function getRouteForLanguage(language) {
  const lang = (language || '').toLowerCase();
  const envRoute = process.env[`TTS_ROUTE_${lang.toUpperCase()}`];
  if (envRoute) return envRoute.toLowerCase();
  return DEFAULT_ROUTES[lang] || (process.env.TTS_DEFAULT_PROVIDER || 'elevenlabs').toLowerCase();
}

function ensureDir() {
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }
}

function buildCachePaths(provider, language, speed, voiceKey, text) {
  const hash = crypto
    .createHash('sha256')
    .update(`${provider}|${language}|${speed}|${voiceKey}|${text}`)
    .digest('hex')
    .slice(0, 32);
  const filename = `tts_${provider}_${hash}.mp3`;
  return {
    filePath: path.join(AUDIO_DIR, filename),
    audioUrl: `/uploads/audio/${filename}`,
  };
}

async function tryProvider(provider, text, options) {
  const language = (options.language || 'default').toLowerCase();
  const speed = options.speed || 'normal';

  if (provider === 'azure') {
    if (!azureTtsService.isConfigured() || !azureTtsService.supportsLanguage(language)) {
      return null;
    }
    const resolved = azureTtsService.getVoiceForLanguage(language);
    const cache = buildCachePaths('azure', language, speed, resolved.voice, text);

    if (cachingEnabled() && fs.existsSync(cache.filePath)) {
      return { audioUrl: cache.audioUrl, provider: 'azure', cached: true };
    }

    const { audioBuffer } = await azureTtsService.synthesizeBuffer(text, options);
    ensureDir();
    fs.writeFileSync(cache.filePath, audioBuffer);
    return { audioUrl: cache.audioUrl, provider: 'azure', cached: false };
  }

  if (provider === 'elevenlabs') {
    const voiceId = elevenLabsService.getVoiceIdForLanguage(language, options.voiceId);
    const cache = buildCachePaths('elevenlabs', language, speed, voiceId || 'default', text);

    if (cachingEnabled() && fs.existsSync(cache.filePath)) {
      return { audioUrl: cache.audioUrl, provider: 'elevenlabs', cached: true };
    }

    const { audioBuffer } = await elevenLabsService.synthesizeBuffer(text, options);
    ensureDir();
    fs.writeFileSync(cache.filePath, audioBuffer);
    return { audioUrl: cache.audioUrl, provider: 'elevenlabs', cached: false };
  }

  return null;
}

/**
 * Synthesize speech for the given text/language using the cheapest capable
 * provider, with caching and a device-TTS fallback.
 * @returns {Promise<{ audioUrl: string|null, provider: string, cached?: boolean }>}
 */
const synthesize = async (text, options = {}) => {
  if (!text || !text.trim()) {
    return { audioUrl: null, provider: 'none' };
  }

  const language = options.language || null;
  const primary = getRouteForLanguage(language);
  // Try primary, then the other cloud provider, then device TTS (null).
  const chain = primary === 'azure' ? ['azure', 'elevenlabs'] : ['elevenlabs', 'azure'];

  for (const provider of chain) {
    try {
      const result = await tryProvider(provider, text, options);
      if (result && result.audioUrl) {
        if (!result.cached) {
          console.log(
            `[TTS] ${provider} synthesized (${language || 'n/a'}, ${text.length} chars)`
          );
        }
        return result;
      }
    } catch (err) {
      console.warn(`[TTS] ${provider} failed for "${language}": ${err.message}`);
    }
  }

  console.warn(`[TTS] no cloud provider available for "${language}" — client will use device TTS`);
  return { audioUrl: null, provider: 'device' };
};

module.exports = {
  synthesize,
  getRouteForLanguage,
};
