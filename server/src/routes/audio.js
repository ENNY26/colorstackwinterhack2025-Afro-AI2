const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const { uploadAudio, uploadAudioToMemory, deleteUploadedFile } = require('../middleware/upload');
const { asyncHandler } = require('../middleware/errorHandler');
const { whisperService, elevenLabsService } = require('../services');
const { AFRICAN_LANGUAGES } = require('../config/constants');

const router = express.Router();

/**
 * @route   POST /api/audio/transcribe
 * @desc    Transcribe audio file to text using Whisper
 * @access  Private
 */
router.post('/transcribe', auth, uploadAudio.single('audio'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No audio file provided',
    });
  }

  const language = req.body.language;
  
  try {
    const { text, language: detectedLanguage } = await whisperService.transcribeAudio(
      req.file.path,
      language
    );

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
    // Clean up file on error
    deleteUploadedFile(req.file.path);
    throw error;
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
  
  const { text, language: detectedLanguage } = await whisperService.transcribeAudioBuffer(
    req.file.buffer,
    req.file.originalname,
    language
  );

  res.json({
    success: true,
    data: {
      text,
      language: detectedLanguage,
    },
  });
}));

/**
 * @route   POST /api/audio/synthesize
 * @desc    Convert text to speech using ElevenLabs
 * @access  Private
 */
router.post('/synthesize', auth, [
  body('text').trim().notEmpty().withMessage('Text is required'),
  body('speed').optional().isIn(['slow', 'normal', 'fast']),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { text, speed, voiceId } = req.body;

  const result = await elevenLabsService.textToSpeech(text, {
    speed: speed || req.user.voiceSpeed,
    voiceId,
  });

  res.json({
    success: true,
    data: {
      audioUrl: result.audioUrl,
    },
  });
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

