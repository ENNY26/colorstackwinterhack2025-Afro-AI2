const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', auth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.json({
    success: true,
    data: { user },
  });
}));

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', auth, [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('selectedLanguage').optional().isIn(['yoruba', 'swahili', 'hausa', 'zulu', 'amharic', 'igbo', 'xhosa', 'akan']),
  body('aiPersonality').optional().isIn(['quirky', 'professional', 'friendly', 'patient', 'humorous']),
  body('voiceSpeed').optional().isIn(['slow', 'normal', 'fast']),
  body('theme').optional().isIn(['light', 'dark']),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const allowedUpdates = [
    'name',
    'avatar',
    'selectedLanguage',
    'aiPersonality',
    'voiceSpeed',
    'theme',
    'notificationsEnabled',
  ];

  const updates = {};
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user },
  });
}));

/**
 * @route   PUT /api/users/password
 * @desc    Change password
 * @access  Private
 */
router.put('/password', auth, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect',
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password updated successfully',
  });
}));

/**
 * @route   GET /api/users/stats
 * @desc    Get user learning statistics
 * @access  Private
 */
router.get('/stats', auth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const Vocabulary = require('../models/Vocabulary');
  const Conversation = require('../models/Conversation');

  // Get vocabulary stats
  const vocabularyStats = await Vocabulary.getUserStats(req.user._id);

  // Get conversation count
  const conversationCount = await Conversation.countDocuments({ user: req.user._id });

  // Get total practice time
  const practiceTime = await Conversation.aggregate([
    { $match: { user: req.user._id } },
    { $group: { _id: null, totalMinutes: { $sum: '$stats.durationMinutes' } } },
  ]);

  res.json({
    success: true,
    data: {
      stats: user.stats,
      vocabularyStats,
      totalConversations: conversationCount,
      totalPracticeMinutes: practiceTime[0]?.totalMinutes || 0,
    },
  });
}));

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account', auth, asyncHandler(async (req, res) => {
  const Vocabulary = require('../models/Vocabulary');
  const Conversation = require('../models/Conversation');

  // Delete user's data
  await Vocabulary.deleteMany({ user: req.user._id });
  await Conversation.deleteMany({ user: req.user._id });
  await User.findByIdAndDelete(req.user._id);

  res.json({
    success: true,
    message: 'Account deleted successfully',
  });
}));

module.exports = router;

