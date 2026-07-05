const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Voice speed multipliers (applied on top of ELEVENLABS_SPEED / voice_settings.speed)
const VOICE_SPEEDS = {
  slow: 0.75,
  normal: 1.0,
  fast: 1.25,
};

const parseEnvFloat = (key, defaultValue) => {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return defaultValue;
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : defaultValue;
};

const parseEnvBool = (key, defaultValue) => {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return defaultValue;
  return ['true', '1', 'yes', 'on'].includes(String(raw).toLowerCase());
};

/**
 * Voice settings from .env — tweak these without changing code.
 * ELEVENLABS_STABILITY, ELEVENLABS_SIMILARITY, ELEVENLABS_STYLE,
 * ELEVENLABS_SPEED, ELEVENLABS_SPEAKER_BOOST
 */
const getEnvVoiceSettings = () => ({
  stability: parseEnvFloat('ELEVENLABS_STABILITY', 0.45),
  similarity_boost: parseEnvFloat('ELEVENLABS_SIMILARITY', 0.75),
  style: parseEnvFloat('ELEVENLABS_STYLE', 0.0),
  speed: parseEnvFloat('ELEVENLABS_SPEED', 1.08),
  use_speaker_boost: parseEnvBool('ELEVENLABS_SPEAKER_BOOST', true),
});

// Optional per-language overrides (off by default; set ELEVENLABS_USE_LANGUAGE_PRESETS=true)
const LANGUAGE_VOICE_SETTINGS = {
  yoruba: {
    stability: 0.45,
    similarity_boost: 0.75,
    style: 0.0,
    speed: 1.08,
    use_speaker_boost: true,
  },
  igbo: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    speed: 1.05,
    use_speaker_boost: true,
  },
  hausa: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    speed: 1.05,
    use_speaker_boost: true,
  },
  swahili: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    speed: 1.05,
    use_speaker_boost: true,
  },
  zulu: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    speed: 1.05,
    use_speaker_boost: true,
  },
  xhosa: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    speed: 1.05,
    use_speaker_boost: true,
  },
  amharic: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    speed: 1.05,
    use_speaker_boost: true,
  },
  akan: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    speed: 1.05,
    use_speaker_boost: true,
  },
};

/**
 * Light text cleanup — preserves Yoruba tone marks (ẹ, ọ, ṣ, grave/acute accents).
 * Does not romanize or strip diacritics.
 */
const normalizeTextForPronunciation = (text, language) => {
  if (!text) return text;

  let normalized = text.trim().replace(/\s+/g, ' ');
  normalized = normalized.replace(/([.!?])\s*/g, '$1 ');

  if (language === 'yoruba') {
    return normalized;
  }

  return normalized;
};

/**
 * Build voice_settings for an ElevenLabs request.
 * Priority: .env defaults → optional language preset → per-call overrides → speed tier multiplier.
 * @param {string} [speedTier] - 'slow' | 'normal' | 'fast' (multiplies voice_settings.speed)
 */
const getVoiceSettingsForLanguage = (language, customSettings = {}, speedTier = 'normal') => {
  let settings = { ...getEnvVoiceSettings() };

  const useLanguagePresets = parseEnvBool('ELEVENLABS_USE_LANGUAGE_PRESETS', false);
  if (useLanguagePresets && language && LANGUAGE_VOICE_SETTINGS[language.toLowerCase()]) {
    settings = {
      ...settings,
      ...LANGUAGE_VOICE_SETTINGS[language.toLowerCase()],
    };
  }

  settings = { ...settings, ...customSettings };

  if (speedTier && speedTier !== 'normal' && VOICE_SPEEDS[speedTier]) {
    settings.speed = (settings.speed ?? 1.0) * VOICE_SPEEDS[speedTier];
  }

  return settings;
};

const logVoiceSettings = (context, voiceSettings, extra = {}) => {
  console.log('[ElevenLabs TTS] voice_settings used:', {
    context,
    ...voiceSettings,
    ...extra,
  });
};

/**
 * Resolve voice ID for a given language, with optional override.
 * Priority:
 *   1) options.voiceId
 *   2) language-specific env (e.g. ELEVENLABS_YORUBA_VOICE_ID)
 *   3) default ELEVENLABS_VOICE_ID
 */
const getVoiceIdForLanguage = (language, overrideVoiceId) => {
  if (overrideVoiceId) return overrideVoiceId;

  const lang = language ? language.toLowerCase() : null;

  if (lang === 'yoruba' && process.env.ELEVENLABS_YORUBA_VOICE_ID) {
    return process.env.ELEVENLABS_YORUBA_VOICE_ID;
  }
  if (lang === 'swahili' && process.env.ELEVENLABS_SWAHILI_VOICE_ID) {
    return process.env.ELEVENLABS_SWAHILI_VOICE_ID;
  }

  return process.env.ELEVENLABS_VOICE_ID;
};

/**
 * Convert text to speech using ElevenLabs API
 * @param {string} text - Text to convert to speech
 * @param {Object} options - TTS options
 * @param {string} options.language - Language code (e.g., 'yoruba')
 * @param {string} options.speed - Speed: 'slow', 'normal', or 'fast' (multiplies ELEVENLABS_SPEED)
 * @param {string} options.voiceId - Override default voice ID
 * @param {string} options.modelId - Override default model ID
 * @param {Object} options.voiceSettings - Custom voice settings to override defaults
 * @returns {Promise<{audioUrl: string, audioBuffer: Buffer}>}
 */
/**
 * Synthesize speech and return the raw MP3 buffer WITHOUT writing a file.
 * Used by the TTS router so it can cache audio under a deterministic name.
 * @returns {Promise<{audioBuffer: Buffer, voiceId: string, modelId: string, voiceSettings: Object}>}
 */
const synthesizeBuffer = async (text, options = {}) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const modelId = options.modelId || process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
  const language = options.language || null;
  const voiceId = getVoiceIdForLanguage(language, options.voiceId);
  const speedOption = options.speed || 'normal';

  if (!apiKey || apiKey.includes('your-')) {
    throw new Error('ELEVENLABS_API_KEY not configured in .env file');
  }

  if (!voiceId || voiceId.includes('your-')) {
    throw new Error('ELEVENLABS_VOICE_ID (or language-specific voice env) not configured in .env file');
  }

  const normalizedText = normalizeTextForPronunciation(text, language);

  const voiceSettings = getVoiceSettingsForLanguage(
    language,
    options.voiceSettings || {},
    speedOption
  );

  logVoiceSettings('synthesizeBuffer', voiceSettings, {
    language,
    voiceId,
    modelId,
    textLength: normalizedText?.length,
  });

  try {
    const response = await axios.post(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        text: normalizedText,
        model_id: modelId,
        voice_settings: voiceSettings,
      },
      {
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        responseType: 'arraybuffer',
      }
    );

    return {
      audioBuffer: Buffer.from(response.data),
      voiceId,
      modelId,
      voiceSettings,
    };
  } catch (error) {
    let errorMessage = error.message;
    let errorDetails = null;

    if (error.response?.data) {
      try {
        const errorData = Buffer.isBuffer(error.response.data)
          ? JSON.parse(error.response.data.toString())
          : error.response.data;

        if (errorData.detail?.message) {
          errorMessage = errorData.detail.message;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.detail) {
          errorMessage = JSON.stringify(errorData.detail);
        }

        errorDetails = errorData;
      } catch (parseErr) {
        if (Buffer.isBuffer(error.response.data)) {
          errorMessage = error.response.data.toString('utf-8');
        }
      }
    }

    if (error.response?.status === 402) {
      console.warn('ElevenLabs: free tier cannot use library voices. Using device TTS for playback.');
      throw new Error(`ElevenLabs free tier limit: ${errorMessage}`);
    }

    console.error('ElevenLabs TTS error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: errorMessage,
      details: errorDetails,
      apiKeySet: !!process.env.ELEVENLABS_API_KEY,
      voiceIdSet: !!process.env.ELEVENLABS_VOICE_ID,
    });

    if (error.response?.status === 401) {
      throw new Error(`ElevenLabs API authentication failed. Check ELEVENLABS_API_KEY. ${errorMessage}`);
    } else if (error.response?.status === 429 || errorMessage?.includes('quota')) {
      throw new Error(`ElevenLabs quota exceeded. ${errorMessage}`);
    } else {
      throw new Error(`Failed to generate speech: ${errorMessage}`);
    }
  }
};

/**
 * Convert text to speech and persist it as an MP3 file (random name).
 * Kept for backward compatibility; the TTS router uses synthesizeBuffer + caching.
 * @returns {Promise<{audioUrl: string, audioBuffer: Buffer, filePath: string, voiceSettings: Object}>}
 */
const textToSpeech = async (text, options = {}) => {
  const { audioBuffer, voiceSettings } = await synthesizeBuffer(text, options);

  const audioDir = process.env.AUDIO_UPLOAD_DIR || './uploads/audio';
  const filename = `tts_${uuidv4()}.mp3`;
  const filePath = path.join(audioDir, filename);

  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  fs.writeFileSync(filePath, audioBuffer);

  return {
    audioUrl: `/uploads/audio/${filename}`,
    audioBuffer,
    filePath,
    voiceSettings,
  };
};

/**
 * Get available voices from ElevenLabs
 * @returns {Promise<Array>} List of available voices
 */
const getAvailableVoices = async () => {
  try {
    const response = await axios.get(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
    });

    return response.data.voices.map(voice => ({
      voiceId: voice.voice_id,
      name: voice.name,
      previewUrl: voice.preview_url,
      category: voice.category,
      labels: voice.labels,
    }));
  } catch (error) {
    console.error('ElevenLabs get voices error:', error);
    throw new Error(`Failed to get voices: ${error.message}`);
  }
};

/**
 * Get user's remaining character quota
 * @returns {Promise<Object>} Subscription info with character count
 */
const getSubscriptionInfo = async () => {
  try {
    const response = await axios.get(`${ELEVENLABS_API_URL}/user/subscription`, {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
    });

    return {
      characterCount: response.data.character_count,
      characterLimit: response.data.character_limit,
      remainingCharacters: response.data.character_limit - response.data.character_count,
      tier: response.data.tier,
    };
  } catch (error) {
    console.error('ElevenLabs subscription info error:', error);
    throw new Error(`Failed to get subscription info: ${error.message}`);
  }
};

/**
 * Stream text to speech (for real-time playback)
 * @param {string} text - Text to convert
 * @param {Object} options - TTS options
 * @returns {Promise<ReadableStream>}
 */
const textToSpeechStream = async (text, options = {}) => {
  try {
    const language = options.language || null;
    const voiceId = getVoiceIdForLanguage(language, options.voiceId);
    const modelId = options.modelId || process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
    const speedOption = options.speed || 'normal';

    const normalizedText = normalizeTextForPronunciation(text, language);

    const voiceSettings = getVoiceSettingsForLanguage(
      language,
      options.voiceSettings || {},
      speedOption
    );

    logVoiceSettings('textToSpeechStream', voiceSettings, {
      language,
      voiceId,
      modelId,
    });

    const response = await axios.post(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`,
      {
        text: normalizedText,
        model_id: modelId,
        voice_settings: voiceSettings,
      },
      {
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
        },
        responseType: 'stream',
      }
    );

    return response.data;
  } catch (error) {
    console.error('ElevenLabs TTS stream error:', error);
    throw new Error(`Failed to stream speech: ${error.message}`);
  }
};

/**
 * Generate pronunciation audio for a single word
 * @param {string} word - Word to pronounce
 * @param {string} language - Language code
 * @returns {Promise<{audioUrl: string}>}
 */
const generatePronunciation = async (word, language) => {
  const pronounceText = `${word}.`;

  const baseSettings = getVoiceSettingsForLanguage(language, {}, 'normal');
  const pronunciationSettings = {
    ...baseSettings,
    stability: Math.min(0.75, baseSettings.stability + 0.1),
    similarity_boost: Math.min(0.9, baseSettings.similarity_boost + 0.05),
  };

  return textToSpeech(pronounceText, {
    language,
    voiceSettings: pronunciationSettings,
    speed: 'normal',
  });
};

module.exports = {
  textToSpeech,
  synthesizeBuffer,
  textToSpeechStream,
  getAvailableVoices,
  getSubscriptionInfo,
  generatePronunciation,
  getEnvVoiceSettings,
  getVoiceSettingsForLanguage,
  getVoiceIdForLanguage,
};
