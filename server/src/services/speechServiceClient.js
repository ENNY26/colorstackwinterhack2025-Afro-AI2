/**
 * Proxies pronunciation / practice-round requests to the FastAPI ai_speech_service.
 *
 * Set AI_SPEECH_SERVICE_URL in .env (e.g. http://127.0.0.1:8000).
 * The Python service must be running for tutor pronunciation scoring.
 */

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const BASE = (process.env.AI_SPEECH_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

/**
 * POST /practice-round on FastAPI: transcribe + score + fixed encouragement line.
 *
 * @param {string} audioFilePath - temp path from multer
 * @param {string} expectedText - target phrase (e.g. Yoruba)
 * @param {string} [mode='tutor'] - 'tutor' | 'roleplay'
 * @returns {Promise<{ expected: string, transcribed: string, score: number, feedback: string, ai_response: string }>}
 */
async function forwardPracticeRound(audioFilePath, expectedText, mode = 'tutor') {
  const form = new FormData();
  form.append('audio', fs.createReadStream(audioFilePath), {
    filename: path.basename(audioFilePath) || 'recording.m4a',
    contentType: 'audio/m4a',
  });
  form.append('expected_text', expectedText);
  form.append('mode', mode);

  const url = `${BASE}/practice-round`;
  const { data } = await axios.post(url, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 120000,
  });

  return data;
}

/**
 * POST /transcribe on FastAPI — local Whisper (no OpenAI HTTP). Use when OPENAI fails or offline.
 */
async function forwardTranscribe(audioFilePath) {
  const form = new FormData();
  form.append('audio', fs.createReadStream(audioFilePath), {
    filename: path.basename(audioFilePath) || 'recording.webm',
  });

  const url = `${BASE}/transcribe`;

  try {
    const { data } = await axios.post(url, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 120000,
    });

    const text = data.transcription || data.text || '';
    return {
      text: String(text).trim(),
      language: 'detected',
    };
  } catch (err) {
    const code = err.code || err.cause?.code;
    const status = err.response?.status;
    const detail = err.response?.data?.detail ?? err.response?.data;
    const detailStr =
      typeof detail === 'string'
        ? detail
        : detail != null
          ? JSON.stringify(detail)
          : '';

    let msg;
    if (status) {
      msg = `Local Whisper HTTP ${status}${detailStr ? `: ${detailStr}` : ''}`;
    } else if (code === 'ECONNREFUSED') {
      msg = `Cannot reach ai_speech_service at ${BASE} (ECONNREFUSED — start: uvicorn api.main:app --host 0.0.0.0 --port 8000)`;
    } else if (code === 'ENOTFOUND') {
      msg = `Cannot resolve ai_speech_service host (${BASE}): ${err.message}`;
    } else {
      msg = err.message || 'Local Whisper request failed';
    }

    const wrapped = new Error(msg);
    wrapped.cause = err;
    throw wrapped;
  }
}

module.exports = {
  forwardPracticeRound,
  forwardTranscribe,
  getSpeechServiceBaseUrl: () => BASE,
};
