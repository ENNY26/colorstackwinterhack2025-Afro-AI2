const OpenAI = require('openai');
const fs = require('fs');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** OpenAI client: long timeout + SDK-level retries help with flaky TLS (ECONNRESET). */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 180000,
  maxRetries: 2,
});

function isConnectionError(err) {
  const msg = String(err?.message || '').toLowerCase();
  const code = err?.code || err?.cause?.code;
  return (
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    msg.includes('connection') ||
    msg.includes('fetch failed') ||
    msg.includes('socket') ||
    msg.includes('network')
  );
}

/**
 * Transcribe audio file using OpenAI Whisper
 * @param {string} audioFilePath - Path to the audio file
 * @param {string} language - Target language for transcription hints
 * @returns {Promise<{text: string, language: string}>}
 */
const transcribeAudio = async (audioFilePath, language = null) => {
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
  const maxAttempts = 3;
  let lastErr;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const audioFile = fs.createReadStream(audioFilePath);

      const transcriptionOptions = {
        file: audioFile,
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
      lastErr = error;
      console.error(
        `Whisper transcription error (attempt ${attempt}/${maxAttempts}):`,
        error.message || error
      );

      const retryable = attempt < maxAttempts && isConnectionError(error);
      if (retryable) {
        await sleep(600 * attempt);
        continue;
      }

      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  throw new Error(`Failed to transcribe audio: ${lastErr?.message || 'unknown'}`);
};

/**
 * Transcribe audio from buffer (for memory storage)
 */
const transcribeAudioBuffer = async (audioBuffer, filename, language = null) => {
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

  const file = new File([audioBuffer], filename, { type: 'audio/webm' });

  const maxAttempts = 3;
  let lastErr;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
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
      lastErr = error;
      console.error(
        `Whisper buffer transcription error (attempt ${attempt}/${maxAttempts}):`,
        error.message || error
      );

      if (attempt < maxAttempts && isConnectionError(error)) {
        await sleep(600 * attempt);
        continue;
      }

      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  throw new Error(`Failed to transcribe audio: ${lastErr?.message || 'unknown'}`);
};

module.exports = {
  transcribeAudio,
  transcribeAudioBuffer,
};
