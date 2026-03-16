const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Default voice settings
// NOTE: Lowering `stability` and `similarity_boost` a bit can reduce robotic, "locked" speech
// and allow the model more natural variation. `style` increases expressiveness.
const DEFAULT_VOICE_SETTINGS = {
  stability: 0.45,
  similarity_boost: 0.7,
  style: 0.25,
  use_speaker_boost: true,
};

// Language-specific voice settings optimized for African languages
// These settings improve pronunciation quality for tonal languages like Yoruba
const LANGUAGE_VOICE_SETTINGS = {
  yoruba: {
    stability: 0.55,
    similarity_boost: 0.8,
    style: 0.35,
    use_speaker_boost: true,
  },
  igbo: {
    stability: 0.55,
    similarity_boost: 0.8,
    style: 0.35,
    use_speaker_boost: true,
  },
  hausa: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.3,
    use_speaker_boost: true,
  },
  swahili: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.3,
    use_speaker_boost: true,
  },
  zulu: {
    stability: 0.55,
    similarity_boost: 0.8,
    style: 0.35,
    use_speaker_boost: true,
  },
  xhosa: {
    stability: 0.55,
    similarity_boost: 0.8,
    style: 0.35,
    use_speaker_boost: true,
  },
  amharic: {
    stability: 0.55,
    similarity_boost: 0.8,
    style: 0.35,
    use_speaker_boost: true,
  },
  akan: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.3,
    use_speaker_boost: true,
  },
};

// Voice speed multipliers
const VOICE_SPEEDS = {
  slow: 0.75,
  normal: 1.0,
  fast: 1.25,
};

/**
 * Normalize text for better pronunciation (especially for tonal languages)
 * This helps the TTS engine better understand Yoruba tonal marks and accents
 */
const normalizeTextForPronunciation = (text, language) => {
  if (!text) return text;
  
  // For Yoruba specifically, ensure proper spacing and preserve tonal marks
  if (language === 'yoruba') {
    // Remove extra spaces but preserve intentional spacing
    let normalized = text.trim().replace(/\s+/g, ' ');
    // Ensure tonal marks are preserved (ẹ, ọ, ṣ, etc.)
    // Add slight pauses after punctuation for better intonation
    normalized = normalized.replace(/([.!?])\s*/g, '$1 ');
    return normalized;
  }
  
  // General normalization for other languages
  return text.trim().replace(/\s+/g, ' ');
};

/**
 * Get optimized voice settings for a specific language
 */
const getVoiceSettingsForLanguage = (language, customSettings = {}) => {
  // Start with default settings
  let settings = { ...DEFAULT_VOICE_SETTINGS };

  // Apply language-specific optimizations if available
  if (language && LANGUAGE_VOICE_SETTINGS[language.toLowerCase()]) {
    settings = {
      ...settings,
      ...LANGUAGE_VOICE_SETTINGS[language.toLowerCase()],
    };
  }

  // If caller requested a "naturalize" mode, relax stability/similarity for more natural speech
  if (customSettings && customSettings.naturalize) {
    settings.stability = Math.max(0.25, settings.stability - 0.15);
    settings.similarity_boost = Math.max(0.5, settings.similarity_boost - 0.15);
    settings.style = Math.min(0.6, settings.style + 0.15);
    // Remove the helper flag so it doesn't get sent to the API
    delete customSettings.naturalize;
  }

  // Apply any custom settings (highest priority)
  settings = { ...settings, ...customSettings };

  return settings;
};

/**
 * Convert text to speech using ElevenLabs API
 * @param {string} text - Text to convert to speech
 * @param {Object} options - TTS options
 * @param {string} options.language - Language code (e.g., 'yoruba') for optimized settings
 * @param {string} options.speed - Speed: 'slow', 'normal', or 'fast'
 * @param {string} options.voiceId - Override default voice ID
 * @param {string} options.modelId - Override default model ID
 * @param {Object} options.voiceSettings - Custom voice settings to override defaults
 * @returns {Promise<{audioUrl: string, audioBuffer: Buffer}>}
 */
const textToSpeech = async (text, options = {}) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = options.voiceId || process.env.ELEVENLABS_VOICE_ID;
    const speed = VOICE_SPEEDS[options.speed] || 1.0;
    const modelId = options.modelId || 'eleven_multilingual_v2';
    const language = options.language || null;

    if (!apiKey || apiKey.includes('your-')) {
      throw new Error('ELEVENLABS_API_KEY not configured in .env file');
    }

    if (!voiceId || voiceId.includes('your-')) {
      throw new Error('ELEVENLABS_VOICE_ID not configured in .env file');
    }

    // Normalize text for better pronunciation
    const normalizedText = normalizeTextForPronunciation(text, language);
    
    // Get optimized voice settings for the language
    // Apply a default `naturalize` tweak for supported African languages to reduce roboticness
    const voiceSettings = getVoiceSettingsForLanguage(
      language,
      {
        ...(options.voiceSettings || {}),
        ...(language ? { naturalize: true } : {}),
      }
    );

    const response = await axios.post(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        text: normalizedText,
        model_id: modelId,
        voice_settings: voiceSettings,
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        responseType: 'arraybuffer',
      }
    );

    const audioBuffer = Buffer.from(response.data);

    // Save audio file
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
    };
  } catch (error) {
    // Parse error response if it's a Buffer
    let errorMessage = error.message;
    let errorDetails = null;
    
    if (error.response?.data) {
      try {
        // If it's a Buffer, convert to string first
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
        // If parsing fails, try to convert buffer to string
        if (Buffer.isBuffer(error.response.data)) {
          errorMessage = error.response.data.toString('utf-8');
        }
      }
    }
    
    // 402 = free tier cannot use library/premium voices — app will use device TTS
    if (error.response?.status === 402) {
      console.warn('ElevenLabs: free tier cannot use library voices. Using device TTS for playback.');
      throw new Error(`ElevenLabs free tier limit: ${errorMessage}`);
    }

    // Log other errors in full
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
    const voiceId = options.voiceId || process.env.ELEVENLABS_VOICE_ID;
    const modelId = options.modelId || 'eleven_multilingual_v2';
    const language = options.language || null;

    // Normalize text for better pronunciation
    const normalizedText = normalizeTextForPronunciation(text, language);
    
    // Get optimized voice settings for the language
    const voiceSettings = getVoiceSettingsForLanguage(
      language,
      {
        ...(options.voiceSettings || {}),
        ...(language ? { naturalize: true } : {}),
      }
    );

    const response = await axios.post(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`,
      {
        text: normalizedText,
        model_id: modelId,
        voice_settings: voiceSettings,
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
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
  // For better pronunciation of single words, add slight pauses
  // This helps especially for tonal languages where each syllable matters
  const pronounceText = `${word}.`;
  
  // Get optimized settings for the language, with extra emphasis for word pronunciation
  const baseSettings = getVoiceSettingsForLanguage(language);
  const pronunciationSettings = {
    ...baseSettings,
    stability: Math.min(0.75, baseSettings.stability + 0.1), // Even higher stability for word clarity
    similarity_boost: Math.min(0.9, baseSettings.similarity_boost + 0.05), // Higher similarity for accuracy
  };
  
  return textToSpeech(pronounceText, {
    language: language,
    voiceSettings: pronunciationSettings,
  });
};

module.exports = {
  textToSpeech,
  textToSpeechStream,
  getAvailableVoices,
  getSubscriptionInfo,
  generatePronunciation,
};

