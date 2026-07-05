const axios = require('axios');

/**
 * Azure Neural Text-to-Speech (REST API).
 *
 * ~10x cheaper than ElevenLabs with a 500K chars/month free tier. Good neural
 * coverage for several African languages. Configure with:
 *   AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (e.g. "eastus")
 *
 * Per-language voice can be overridden with AZURE_<LANG>_VOICE
 * (e.g. AZURE_SWAHILI_VOICE=sw-KE-RafikiNeural).
 */

// Default neural voices per language (locale derived from the voice prefix).
const AZURE_VOICES = {
  swahili: 'sw-KE-ZuriNeural',
  zulu: 'zu-ZA-ThandoNeural',
  amharic: 'am-ET-MekdesNeural',
  somali: 'so-SO-UbaxNeural',
};

// SSML prosody rate per speed tier.
const RATE_MAP = {
  slow: '-20%',
  normal: '0%',
  fast: '+20%',
};

function isConfigured() {
  return Boolean(
    process.env.AZURE_SPEECH_KEY &&
    process.env.AZURE_SPEECH_REGION &&
    !process.env.AZURE_SPEECH_KEY.includes('your-')
  );
}

/**
 * Resolve the Azure voice + locale for a language, honoring env overrides.
 * @returns {{ voice: string, locale: string } | null}
 */
function getVoiceForLanguage(language) {
  if (!language) return null;
  const lang = language.toLowerCase();

  const envVoice = process.env[`AZURE_${lang.toUpperCase()}_VOICE`];
  const voice = envVoice || AZURE_VOICES[lang];
  if (!voice) return null;

  // Locale is the first two segments of the voice name, e.g. "sw-KE-ZuriNeural" -> "sw-KE".
  const locale = voice.split('-').slice(0, 2).join('-');
  return { voice, locale };
}

function supportsLanguage(language) {
  return Boolean(getVoiceForLanguage(language));
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Synthesize speech via Azure and return the raw MP3 buffer.
 * @returns {Promise<{ audioBuffer: Buffer, voice: string }>}
 */
const synthesizeBuffer = async (text, options = {}) => {
  if (!isConfigured()) {
    throw new Error('Azure Speech not configured (AZURE_SPEECH_KEY / AZURE_SPEECH_REGION)');
  }

  const language = options.language || null;
  const resolved = getVoiceForLanguage(language);
  if (!resolved) {
    throw new Error(`Azure has no configured voice for language: ${language}`);
  }

  const region = process.env.AZURE_SPEECH_REGION;
  const key = process.env.AZURE_SPEECH_KEY;
  const rate = RATE_MAP[options.speed] || RATE_MAP.normal;

  const ssml =
    `<speak version="1.0" xml:lang="${resolved.locale}">` +
    `<voice name="${resolved.voice}">` +
    `<prosody rate="${rate}">${escapeXml(text)}</prosody>` +
    `</voice></speak>`;

  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const response = await axios.post(url, ssml, {
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'afro-ai',
    },
    responseType: 'arraybuffer',
    timeout: 15000,
  });

  return {
    audioBuffer: Buffer.from(response.data),
    voice: resolved.voice,
  };
};

module.exports = {
  synthesizeBuffer,
  isConfigured,
  getVoiceForLanguage,
  supportsLanguage,
};
