const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Vocabulary = require('../models/Vocabulary');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { elevenLabsService } = require('../services');
const { AFRICAN_LANGUAGES } = require('../config/constants');

const router = express.Router();

/**
 * @route   GET /api/vocabulary
 * @desc    Get user's vocabulary
 * @access  Private
 */
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('language').optional().isIn(Object.keys(AFRICAN_LANGUAGES)),
  query('category').optional(),
  query('favorites').optional().isBoolean(),
  query('search').optional().trim(),
], asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = { user: req.user._id };
  
  if (req.query.language) filter.language = req.query.language;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.favorites === 'true') filter.isFavorite = true;
  if (req.query.search) {
    filter.$or = [
      { word: { $regex: req.query.search, $options: 'i' } },
      { translation: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const [vocabulary, total] = await Promise.all([
    Vocabulary.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Vocabulary.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      vocabulary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
}));

/**
 * @route   GET /api/vocabulary/stats
 * @desc    Get vocabulary statistics
 * @access  Private
 */
router.get('/stats', auth, asyncHandler(async (req, res) => {
  const language = req.query.language;
  const stats = await Vocabulary.getUserStats(req.user._id, language);

  res.json({
    success: true,
    data: { stats },
  });
}));

/**
 * @route   GET /api/vocabulary/review
 * @desc    Get words due for review (spaced repetition)
 * @access  Private
 */
router.get('/review', auth, [
  query('language').optional().isIn(Object.keys(AFRICAN_LANGUAGES)),
  query('limit').optional().isInt({ min: 1, max: 50 }),
], asyncHandler(async (req, res) => {
  const language = req.query.language || req.user.selectedLanguage;
  const limit = parseInt(req.query.limit) || 10;

  const words = await Vocabulary.getWordsForReview(req.user._id, language, limit);

  res.json({
    success: true,
    data: { words },
  });
}));

/**
 * @route   POST /api/vocabulary
 * @desc    Add a new vocabulary word
 * @access  Private
 */
router.post('/', auth, [
  body('word').trim().notEmpty().withMessage('Word is required'),
  body('translation').trim().notEmpty().withMessage('Translation is required'),
  body('language').isIn(Object.keys(AFRICAN_LANGUAGES)).withMessage('Invalid language'),
  body('pronunciation').optional().trim(),
  body('category').optional().isIn(['greetings', 'numbers', 'family', 'food', 'travel', 'common', 'phrases', 'verbs', 'nouns', 'adjectives', 'other']),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { word, translation, language, pronunciation, category, exampleSentence, exampleTranslation } = req.body;

  // Check if word already exists
  const existing = await Vocabulary.findOne({
    user: req.user._id,
    language,
    word,
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: 'Word already exists in your vocabulary',
    });
  }

  const vocabularyWord = new Vocabulary({
    user: req.user._id,
    word,
    translation,
    language,
    pronunciation,
    category: category || 'common',
    exampleSentence,
    exampleTranslation,
    source: 'manual',
  });

  await vocabularyWord.save();

  // Update user stats
  req.user.stats.wordsLearned += 1;
  await req.user.save();

  res.status(201).json({
    success: true,
    message: 'Word added to vocabulary',
    data: { vocabulary: vocabularyWord },
  });
}));

/**
 * @route   PUT /api/vocabulary/:id
 * @desc    Update a vocabulary word
 * @access  Private
 */
router.put('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid vocabulary ID'),
], asyncHandler(async (req, res) => {
  const allowedUpdates = ['translation', 'pronunciation', 'category', 'exampleSentence', 'exampleTranslation', 'isFavorite'];
  const updates = {};
  
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const vocabularyWord = await Vocabulary.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    updates,
    { new: true, runValidators: true }
  );

  if (!vocabularyWord) {
    return res.status(404).json({
      success: false,
      message: 'Word not found',
    });
  }

  res.json({
    success: true,
    message: 'Word updated',
    data: { vocabulary: vocabularyWord },
  });
}));

/**
 * @route   PUT /api/vocabulary/:id/favorite
 * @desc    Toggle favorite status
 * @access  Private
 */
router.put('/:id/favorite', auth, [
  param('id').isMongoId().withMessage('Invalid vocabulary ID'),
], asyncHandler(async (req, res) => {
  const vocabularyWord = await Vocabulary.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!vocabularyWord) {
    return res.status(404).json({
      success: false,
      message: 'Word not found',
    });
  }

  vocabularyWord.isFavorite = !vocabularyWord.isFavorite;
  await vocabularyWord.save();

  res.json({
    success: true,
    data: {
      isFavorite: vocabularyWord.isFavorite,
    },
  });
}));

/**
 * @route   POST /api/vocabulary/:id/review
 * @desc    Record a review result
 * @access  Private
 */
router.post('/:id/review', auth, [
  param('id').isMongoId().withMessage('Invalid vocabulary ID'),
  body('correct').isBoolean().withMessage('Correct field is required'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const vocabularyWord = await Vocabulary.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!vocabularyWord) {
    return res.status(404).json({
      success: false,
      message: 'Word not found',
    });
  }

  vocabularyWord.recordReview(req.body.correct);
  await vocabularyWord.save();

  res.json({
    success: true,
    data: {
      masteryLevel: vocabularyWord.masteryLevel,
      timesReviewed: vocabularyWord.timesReviewed,
      accuracy: vocabularyWord.getAccuracy(),
    },
  });
}));

/**
 * @route   GET /api/vocabulary/:id/audio
 * @desc    Get pronunciation audio for a word
 * @access  Private
 */
router.get('/:id/audio', auth, [
  param('id').isMongoId().withMessage('Invalid vocabulary ID'),
], asyncHandler(async (req, res) => {
  const vocabularyWord = await Vocabulary.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!vocabularyWord) {
    return res.status(404).json({
      success: false,
      message: 'Word not found',
    });
  }

  // If audio already exists, return it
  if (vocabularyWord.audioUrl) {
    return res.json({
      success: true,
      data: { audioUrl: vocabularyWord.audioUrl },
    });
  }

  // Generate new audio
  const result = await elevenLabsService.generatePronunciation(
    vocabularyWord.word,
    vocabularyWord.language
  );

  // Save audio URL
  vocabularyWord.audioUrl = result.audioUrl;
  await vocabularyWord.save();

  res.json({
    success: true,
    data: { audioUrl: result.audioUrl },
  });
}));

/**
 * @route   DELETE /api/vocabulary/:id
 * @desc    Delete a vocabulary word
 * @access  Private
 */
router.delete('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid vocabulary ID'),
], asyncHandler(async (req, res) => {
  const vocabularyWord = await Vocabulary.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!vocabularyWord) {
    return res.status(404).json({
      success: false,
      message: 'Word not found',
    });
  }

  res.json({
    success: true,
    message: 'Word deleted',
  });
}));

module.exports = router;

