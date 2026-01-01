const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Default voice settings
const DEFAULT_VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true,
};

// Voice speed multipliers
const VOICE_SPEEDS = {
  slow: 0.75,
  normal: 1.0,
  fast: 1.25,
};

/**
 * Convert text to speech using ElevenLabs API
 * @param {string} text - Text to convert to speech
 * @param {Object} options - TTS options
 * @returns {Promise<{audioUrl: string, audioBuffer: Buffer}>}
 */
const textToSpeech = async (text, options = {}) => {
  try {
    const voiceId = options.voiceId || process.env.ELEVENLABS_VOICE_ID;
    const speed = VOICE_SPEEDS[options.speed] || 1.0;
    const modelId = options.modelId || 'eleven_multilingual_v2';

    if (!voiceId) {
      throw new Error('No voice ID configured');
    }

    const response = await axios.post(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        text,
        model_id: modelId,
        voice_settings: {
          ...DEFAULT_VOICE_SETTINGS,
          ...options.voiceSettings,
        },
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
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
    console.error('ElevenLabs TTS error:', error.response?.data || error);
    throw new Error(`Failed to generate speech: ${error.message}`);
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

    const response = await axios.post(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`,
      {
        text,
        model_id: modelId,
        voice_settings: {
          ...DEFAULT_VOICE_SETTINGS,
          ...options.voiceSettings,
        },
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
  // Add slight pause and emphasis for pronunciation
  const pronounceText = `${word}`;
  
  return textToSpeech(pronounceText, {
    voiceSettings: {
      stability: 0.7, // Higher stability for clearer pronunciation
      similarity_boost: 0.8,
    },
  });
};

module.exports = {
  textToSpeech,
  textToSpeechStream,
  getAvailableVoices,
  getSubscriptionInfo,
  generatePronunciation,
};

