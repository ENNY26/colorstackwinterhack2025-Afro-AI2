const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribe audio file using OpenAI Whisper
 * @param {string} audioFilePath - Path to the audio file
 * @param {string} language - Target language for transcription hints
 * @returns {Promise<{text: string, language: string}>}
 */
const transcribeAudio = async (audioFilePath, language = null) => {
  try {
    // Map our language codes to Whisper language codes
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

    const whisperLanguage = language ? languageMap[language] : null;

    // Create a readable stream from the file
    const audioFile = fs.createReadStream(audioFilePath);

    const transcriptionOptions = {
      file: audioFile,
      model: 'whisper-1',
      response_format: 'json',
    };

    // Add language hint if provided (helps with accuracy)
    if (whisperLanguage) {
      transcriptionOptions.language = whisperLanguage;
    }

    const response = await openai.audio.transcriptions.create(transcriptionOptions);

    return {
      text: response.text,
      language: language || 'detected',
    };
  } catch (error) {
    console.error('Whisper transcription error:', error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
};

/**
 * Transcribe audio from buffer (for memory storage)
 * @param {Buffer} audioBuffer - Audio data buffer
 * @param {string} filename - Original filename
 * @param {string} language - Target language
 * @returns {Promise<{text: string, language: string}>}
 */
const transcribeAudioBuffer = async (audioBuffer, filename, language = null) => {
  try {
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

    const whisperLanguage = language ? languageMap[language] : null;

    // Create a File-like object from buffer
    const file = new File([audioBuffer], filename, { type: 'audio/webm' });

    const transcriptionOptions = {
      file,
      model: 'whisper-1',
      response_format: 'json',
    };

    if (whisperLanguage) {
      transcriptionOptions.language = whisperLanguage;
    }

    const response = await openai.audio.transcriptions.create(transcriptionOptions);

    return {
      text: response.text,
      language: language || 'detected',
    };
  } catch (error) {
    console.error('Whisper transcription error:', error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
};

module.exports = {
  transcribeAudio,
  transcribeAudioBuffer,
};

