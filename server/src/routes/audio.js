const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const { uploadAudio, uploadAudioToMemory, deleteUploadedFile } = require('../middleware/upload');
const { asyncHandler } = require('../middleware/errorHandler');
const { whisperService, elevenLabsService } = require('../services');
const { forwardPracticeRound, forwardTranscribe } = require('../services/speechServiceClient');
const { AFRICAN_LANGUAGES } = require('../config/constants');

const router = express.Router();

/**
 * TRANSCRIBE_PROVIDER (default local_first):
 *   - local_first: FastAPI Whisper at AI_SPEECH_SERVICE_URL, then OpenAI
 *   - openai_first: OpenAI, then local fallback
 *   - local: only FastAPI (set DISABLE_LOCAL_TRANSCRIBE=0)
 *   - openai: only OpenAI (no local fallback)
 * DISABLE_LOCAL_TRANSCRIBE=1 skips all local attempts.
 */
async function transcribeWithProviders(filePath, languageHint) {
  const raw = (process.env.TRANSCRIBE_PROVIDER || 'local_first').toLowerCase().replace(/-/g, '_');
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

  /** @type {{ name: string, fn: () => Promise<{text: string, language: string}|null> }[]} */
  let steps = [];
  switch (raw) {
    case 'openai_first':
      if (hasOpenAI) steps.push({ name: 'OpenAI', fn: tryOpenAI });
      if (!disableLocal) steps.push({ name: 'local Whisper', fn: tryLocal });
      break;
    case 'local':
      if (!disableLocal) steps.push({ name: 'local Whisper', fn: tryLocal });
      break;
    case 'openai':
      if (hasOpenAI) steps.push({ name: 'OpenAI', fn: tryOpenAI });
      break;
    case 'local_first':
    default:
      if (!disableLocal) steps.push({ name: 'local Whisper', fn: tryLocal });
      if (hasOpenAI) steps.push({ name: 'OpenAI', fn: tryOpenAI });
      break;
  }

  if (!steps.length) {
    throw new Error(
      disableLocal && !hasOpenAI
        ? 'No transcription provider available (DISABLE_LOCAL_TRANSCRIBE=1 and OPENAI_API_KEY unset)'
        : 'No transcription provider configured for this request',
    );
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

/**
 * @route   POST /api/audio/transcribe
 * @desc    Transcribe audio file to text using Whisper
 * @access  Private
 */
router.post('/transcribe', auth, uploadAudio.single('audio'), asyncHandler(async (req, res) => {
  // Check if file was uploaded
  if (!req.file) {
    console.error('Transcribe error: No audio file received');
    console.error('Request body:', req.body);
    console.error('Request files:', req.files);
    
    return res.status(400).json({
      success: false,
      message: 'No audio file provided. Please ensure the audio file is sent with the field name "audio".',
      details: {
        hasFile: !!req.file,
        bodyKeys: Object.keys(req.body),
      },
    });
  }

  const language = req.body.language;

  try {
    const { text, language: detectedLanguage } = await transcribeWithProviders(req.file.path, language);

    if (!text || !String(text).trim()) {
      throw new Error('Transcription returned empty text');
    }

    // Optionally delete the uploaded file after processing
    if (req.body.deleteAfterProcessing === 'true') {
      deleteUploadedFile(req.file.path);
    }

    res.json({
      success: true,
      data: {
        text,
        language: detectedLanguage,
        audioPath: req.file.path,
      },
    });
  } catch (error) {
    console.error('Transcription error:', error);
    console.error('Error stack:', error.stack);
    console.error('File info:', req.file ? {
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename,
    } : 'No file received');
    
    // Clean up file on error
    if (req.file && req.file.path) {
      try {
        deleteUploadedFile(req.file.path);
      } catch (deleteErr) {
        console.error('Failed to delete file:', deleteErr);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to transcribe audio',
      error: error.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}));

/**
 * @route   POST /api/audio/transcribe-buffer
 * @desc    Transcribe audio from memory (no file storage)
 * @access  Private
 */
router.post('/transcribe-buffer', auth, uploadAudioToMemory.single('audio'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No audio file provided',
    });
  }

  const language = req.body.language;
  const ext = path.extname(req.file.originalname || '') || '.webm';
  const tmpPath = path.join(os.tmpdir(), `transcribe-${randomUUID()}${ext}`);

  try {
    fs.writeFileSync(tmpPath, req.file.buffer);
    const { text, language: detectedLanguage } = await transcribeWithProviders(tmpPath, language);

    res.json({
      success: true,
      data: {
        text,
        language: detectedLanguage,
      },
    });
  } finally {
    try {
      if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (e) {
      /* ignore */
    }
  }
}));

/**
 * @route   POST /api/audio/practice-round
 * @desc    Transcribe + pronunciation score via FastAPI ai_speech_service (Whisper + difflib)
 * @access  Private
 */
router.post('/practice-round', auth, uploadAudio.single('audio'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No audio file provided. Use field name "audio".',
    });
  }

  const expected_text = (req.body.expected_text || req.body.expected || '').trim();
  if (!expected_text) {
    deleteUploadedFile(req.file.path);
    return res.status(400).json({
      success: false,
      message: 'expected_text is required',
    });
  }

  const mode = (req.body.mode || 'tutor').toLowerCase();
  if (!['tutor', 'roleplay'].includes(mode)) {
    deleteUploadedFile(req.file.path);
    return res.status(400).json({
      success: false,
      message: 'mode must be "tutor" or "roleplay"',
    });
  }

  try {
    const data = await forwardPracticeRound(req.file.path, expected_text, mode);
    deleteUploadedFile(req.file.path);
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    if (req.file && req.file.path) {
      try {
        deleteUploadedFile(req.file.path);
      } catch (e) {
        /* ignore */
      }
    }
    console.error('practice-round proxy error:', error.response?.data || error.message);
    const detail = error.response?.data?.detail;
    const msg = typeof detail === 'string'
      ? detail
      : (Array.isArray(detail) ? detail.map((d) => d.msg || d).join(' ') : null)
      || error.message
      || 'Speech service unavailable';
    const status = error.response?.status && error.response.status < 600
      ? error.response.status
      : 503;
    return res.status(status >= 400 && status < 600 ? status : 503).json({
      success: false,
      message: msg,
    });
  }
}));

/**
 * @route   POST /api/audio/synthesize
 * @desc    Convert text to speech using ElevenLabs
 * @access  Private
 */
router.post('/synthesize', auth, [
  body('text').trim().notEmpty().withMessage('Text is required'),
  body('speed').optional().isIn(['slow', 'normal', 'fast']),
  body('language').optional().isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { text, speed, voiceId, language } = req.body;

  try {
    // Use language from request, or try to get from user's selected language
    const targetLanguage = language || req.user?.selectedLanguage || null;
    
    const result = await elevenLabsService.textToSpeech(text, {
      speed: speed || req.user?.voiceSpeed || 'normal',
      voiceId,
      language: targetLanguage, // Pass language for optimized pronunciation
    });

    res.json({
      success: true,
      data: {
        audioUrl: result.audioUrl,
      },
    });
  } catch (error) {
    console.error('Synthesis error in /api/audio/synthesize:', error.message);
    
    // Return error response instead of throwing (which would be caught by asyncHandler)
    return res.status(503).json({
      success: false,
      message: 'Text-to-speech service unavailable',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}));

/**
 * @route   POST /api/audio/pronounce
 * @desc    Generate pronunciation audio for a word
 * @access  Private
 */
router.post('/pronounce', auth, [
  body('word').trim().notEmpty().withMessage('Word is required'),
  body('language').optional().isIn(Object.keys(AFRICAN_LANGUAGES)),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { word, language } = req.body;

  const result = await elevenLabsService.generatePronunciation(
    word,
    language || req.user.selectedLanguage
  );

  res.json({
    success: true,
    data: {
      word,
      audioUrl: result.audioUrl,
    },
  });
}));

/**
 * @route   GET /api/audio/voices
 * @desc    Get available TTS voices
 * @access  Private
 */
router.get('/voices', auth, asyncHandler(async (req, res) => {
  const voices = await elevenLabsService.getAvailableVoices();

  res.json({
    success: true,
    data: { voices },
  });
}));

/**
 * @route   GET /api/audio/quota
 * @desc    Get TTS usage quota
 * @access  Private
 */
router.get('/quota', auth, asyncHandler(async (req, res) => {
  const subscription = await elevenLabsService.getSubscriptionInfo();

  res.json({
    success: true,
    data: { subscription },
  });
}));

module.exports = router;

