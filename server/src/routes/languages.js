const express = require('express');
const { param } = require('express-validator');
const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { AFRICAN_LANGUAGES, AI_PERSONALITIES, CONVERSATION_TYPES } = require('../config/constants');

const router = express.Router();

/**
 * @route   GET /api/languages
 * @desc    Get all available languages
 * @access  Public
 */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const languages = Object.values(AFRICAN_LANGUAGES);

  res.json({
    success: true,
    data: {
      languages,
      total: languages.length,
    },
  });
}));

/**
 * @route   GET /api/languages/:id
 * @desc    Get a specific language
 * @access  Public
 */
router.get('/:id', optionalAuth, [
  param('id').isIn(Object.keys(AFRICAN_LANGUAGES)).withMessage('Invalid language ID'),
], asyncHandler(async (req, res) => {
  const language = AFRICAN_LANGUAGES[req.params.id];

  if (!language) {
    return res.status(404).json({
      success: false,
      message: 'Language not found',
    });
  }

  res.json({
    success: true,
    data: { language },
  });
}));

/**
 * @route   GET /api/languages/personalities
 * @desc    Get all AI personalities
 * @access  Public
 */
router.get('/config/personalities', optionalAuth, asyncHandler(async (req, res) => {
  const personalities = Object.values(AI_PERSONALITIES).map(p => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    description: p.description,
  }));

  res.json({
    success: true,
    data: { personalities },
  });
}));

/**
 * @route   GET /api/languages/conversation-types
 * @desc    Get conversation types
 * @access  Public
 */
router.get('/config/conversation-types', optionalAuth, asyncHandler(async (req, res) => {
  const types = Object.entries(CONVERSATION_TYPES).map(([id, description]) => ({
    id,
    description,
  }));

  res.json({
    success: true,
    data: { types },
  });
}));

module.exports = router;

