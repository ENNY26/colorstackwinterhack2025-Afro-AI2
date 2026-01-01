const express = require('express');
const { param, query, body, validationResult } = require('express-validator');
const CulturalTip = require('../models/CulturalTip');
const { auth, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { AFRICAN_LANGUAGES } = require('../config/constants');

const router = express.Router();

/**
 * @route   GET /api/tips
 * @desc    Get cultural tips for a language
 * @access  Public
 */
router.get('/', optionalAuth, [
  query('language').isIn(Object.keys(AFRICAN_LANGUAGES)).withMessage('Invalid language'),
  query('type').optional().isIn(['grammar', 'culture', 'pronunciation', 'vocabulary', 'fun_fact', 'etiquette', 'proverb']),
  query('limit').optional().isInt({ min: 1, max: 50 }),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { language, type } = req.query;
  const limit = parseInt(req.query.limit) || 10;

  const filter = { language, isActive: true };
  if (type) filter.type = type;

  const tips = await CulturalTip.find(filter)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: { tips },
  });
}));

/**
 * @route   GET /api/tips/random
 * @desc    Get random cultural tips
 * @access  Public
 */
router.get('/random', optionalAuth, [
  query('language').isIn(Object.keys(AFRICAN_LANGUAGES)).withMessage('Invalid language'),
  query('count').optional().isInt({ min: 1, max: 10 }),
  query('exclude').optional(), // Comma-separated IDs to exclude
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { language, exclude } = req.query;
  const count = parseInt(req.query.count) || 5;
  const excludeIds = exclude ? exclude.split(',') : [];

  const tips = await CulturalTip.getRandomTips(language, count, excludeIds);

  res.json({
    success: true,
    data: { tips },
  });
}));

/**
 * @route   GET /api/tips/:id
 * @desc    Get a specific tip
 * @access  Public
 */
router.get('/:id', optionalAuth, [
  param('id').isMongoId().withMessage('Invalid tip ID'),
], asyncHandler(async (req, res) => {
  const tip = await CulturalTip.findById(req.params.id);

  if (!tip) {
    return res.status(404).json({
      success: false,
      message: 'Tip not found',
    });
  }

  res.json({
    success: true,
    data: { tip },
  });
}));

/**
 * @route   POST /api/tips
 * @desc    Create a new cultural tip (admin)
 * @access  Private
 */
router.post('/', auth, [
  body('language').isIn(Object.keys(AFRICAN_LANGUAGES)).withMessage('Invalid language'),
  body('tip').trim().notEmpty().withMessage('Tip content is required'),
  body('type').optional().isIn(['grammar', 'culture', 'pronunciation', 'vocabulary', 'fun_fact', 'etiquette', 'proverb']),
  body('emoji').optional().trim(),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { language, tip, type, emoji, difficulty, relatedWords } = req.body;

  const culturalTip = new CulturalTip({
    language,
    tip,
    type: type || 'culture',
    emoji: emoji || '💡',
    difficulty: difficulty || 'beginner',
    relatedWords: relatedWords || [],
  });

  await culturalTip.save();

  res.status(201).json({
    success: true,
    message: 'Tip created',
    data: { tip: culturalTip },
  });
}));

module.exports = router;

