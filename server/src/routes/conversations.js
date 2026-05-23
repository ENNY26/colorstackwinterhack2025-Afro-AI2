const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Vocabulary = require('../models/Vocabulary');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { aiTutorService, elevenLabsService } = require('../services');
const { AI_PERSONALITIES, AFRICAN_LANGUAGES, CONVERSATION_TYPES } = require('../config/constants');

const router = express.Router();

/**
 * @route   POST /api/conversations
 * @desc    Start a new conversation
 * @access  Private
 */
router.post('/', auth, [
  body('language').isIn(Object.keys(AFRICAN_LANGUAGES)).withMessage('Invalid language'),
  body('personality').optional().isIn(Object.keys(AI_PERSONALITIES)),
  body('conversationType').optional().isIn(Object.keys(CONVERSATION_TYPES)),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { language, personality, conversationType } = req.body;
  const languageInfo = AFRICAN_LANGUAGES[language];
  const userPersonality = req.user?.aiPersonality || 'friendly';
  const personalityInfo = AI_PERSONALITIES[personality || userPersonality];
  const scenarioLabel = conversationType ? CONVERSATION_TYPES[conversationType] : null;

  const aiMode = conversationType ? 'roleplay' : 'practice';

  // Create new conversation
  const conversation = new Conversation({
    user: req.user?._id || null,
    language,
    personality: personality || userPersonality,
    title: scenarioLabel ? `${languageInfo.name} – ${scenarioLabel}` : `${languageInfo.name} Practice`,
    conversationType: conversationType || null,
  });

  // Build initial prompt: roleplay scenario or open practice
  const initialMessages = conversationType
    ? [{
        role: 'user',
        content:
          `Voice roleplay in ${languageInfo.name} only. Scenario: ${scenarioLabel}. You are the NPC. ` +
          `Reply ONLY in ${languageInfo.name} — no English, no translations. ` +
          `Open in character with 2–3 short sentences, then one question to continue the scene.`,
      }]
    : [];

  const { response: greeting, vocabularyWords } = await aiTutorService.generateResponse(
    initialMessages,
    language,
    conversation.personality,
    { mode: aiMode }
  );

  // Generate audio for greeting
  let audioUrl = null;
  try {
    const voiceSpeed = req.user?.voiceSpeed || 'normal';
    const audioResult = await elevenLabsService.textToSpeech(greeting, {
      speed: voiceSpeed,
      language: language, // Pass language for optimized Yoruba/African language pronunciation
    });
    audioUrl = audioResult.audioUrl;
    console.log('✅ Successfully generated audio for greeting');
  } catch (audioError) {
    console.warn('⚠️ Failed to generate audio with ElevenLabs (will use device TTS as fallback):', audioError.message);
    // Continue without audio - frontend will use device TTS as fallback
  }

  // Add system message and greeting
  conversation.addMessage(
    'system',
    aiTutorService.generateSystemPrompt(language, conversation.personality, { mode: aiMode })
  );
  conversation.addMessage('assistant', greeting, { audioUrl, vocabularyWords });

  await conversation.save();

  // Save vocabulary words
  if (vocabularyWords.length > 0 && req.user?._id) {
    await saveVocabularyWords(req.user._id, language, vocabularyWords, conversation._id);
  }

  // Update user stats
  if (req.user) {
    req.user.stats.totalConversations += 1;
    req.user.updateStreak();
    await req.user.save();
  }

  res.status(201).json({
    success: true,
    message: 'Conversation started',
    data: {
      conversation: {
        id: conversation._id,
        language: conversation.language,
        personality: conversation.personality,
        messages: conversation.messages.filter(m => m.role !== 'system'),
      },
    },
  });
}));

/**
 * @route   POST /api/conversations/:id/message
 * @desc    Send a message in a conversation
 * @access  Private
 */
router.post('/:id/message', auth, [
  param('id').isMongoId().withMessage('Invalid conversation ID'),
  body('content').trim().notEmpty().withMessage('Message content is required'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const conversation = await Conversation.findOne({
    _id: req.params.id,
    ...(req.user?._id ? { user: req.user._id } : {}), // In dev mode, allow any user if no user set
  });

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found',
    });
  }

  if (conversation.status !== 'active') {
    return res.status(400).json({
      success: false,
      message: 'Conversation is not active',
    });
  }

  const { content } = req.body;

  // Add user message
  conversation.addMessage('user', content);

  // Get conversation history for AI (exclude system messages for context)
  const conversationHistory = conversation.messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }));

  const aiMode = conversation.conversationType ? 'roleplay' : 'practice';

  // Generate AI response
  const { response: aiResponse, vocabularyWords } = await aiTutorService.generateResponse(
    conversationHistory,
    conversation.language,
    conversation.personality,
    { mode: aiMode }
  );

  // Generate audio for response
  let audioUrl = null;
  try {
    const audioResult = await elevenLabsService.textToSpeech(aiResponse, {
      speed: req.user?.voiceSpeed || 'normal',
      language: conversation.language, // Pass language for optimized pronunciation
    });
    audioUrl = audioResult.audioUrl;
    console.log('✅ Successfully generated audio for AI response');
  } catch (audioError) {
    console.warn('⚠️ Failed to generate audio with ElevenLabs (will use device TTS as fallback):', audioError.message);
    // Continue without audio - frontend will use device TTS as fallback
  }

  // Add AI response
  conversation.addMessage('assistant', aiResponse, { audioUrl, vocabularyWords });

  await conversation.save();

  // Save vocabulary words
  if (vocabularyWords.length > 0 && req.user?._id) {
    await saveVocabularyWords(req.user._id, conversation.language, vocabularyWords, conversation._id);
    req.user.stats.wordsLearned += vocabularyWords.length;
    await req.user.save();
  }

  res.json({
    success: true,
    data: {
      userMessage: {
        role: 'user',
        content,
        timestamp: new Date(),
      },
      aiMessage: {
        role: 'assistant',
        content: aiResponse,
        audioUrl,
        vocabularyWords,
        timestamp: new Date(),
      },
    },
  });
}));

/**
 * @route   GET /api/conversations/:id/suggestions
 * @desc    Get suggested responses for conversation
 * @access  Private
 */
router.get('/:id/suggestions', auth, [
  param('id').isMongoId().withMessage('Invalid conversation ID'),
], asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    ...(req.user?._id ? { user: req.user._id } : {}), // In dev mode, allow any user if no user set
  });

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found',
    });
  }

  const conversationHistory = conversation.messages
    .filter(m => m.role !== 'system')
    .slice(-6) // Last 6 messages for context
    .map(m => ({ role: m.role, content: m.content }));

  const suggestionMode = conversation.conversationType ? 'roleplay' : 'practice';
  const suggestions = await aiTutorService.generateSuggestedResponses(
    conversationHistory,
    conversation.language,
    { mode: suggestionMode }
  );

  res.json({
    success: true,
    data: { suggestions },
  });
}));

/**
 * @route   GET /api/conversations
 * @desc    Get user's conversations
 * @access  Private
 */
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn(['active', 'completed', 'archived']),
  query('language').optional().isIn(Object.keys(AFRICAN_LANGUAGES)),
], asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = req.user?._id ? { user: req.user._id } : {}; // In dev mode, allow all conversations if no user
  if (req.query.status) filter.status = req.query.status;
  if (req.query.language) filter.language = req.query.language;

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('language personality title stats startedAt endedAt status'),
    Conversation.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      conversations: conversations.map(c => ({
        ...c.toObject(),
        languageInfo: AFRICAN_LANGUAGES[c.language],
      })),
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
 * @route   GET /api/conversations/:id
 * @desc    Get a specific conversation
 * @access  Private
 */
router.get('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid conversation ID'),
], asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    ...(req.user?._id ? { user: req.user._id } : {}), // In dev mode, allow any user if no user set
  });

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found',
    });
  }

  res.json({
    success: true,
    data: {
      conversation: {
        ...conversation.toObject(),
        messages: conversation.messages.filter(m => m.role !== 'system'),
        languageInfo: AFRICAN_LANGUAGES[conversation.language],
      },
    },
  });
}));

/**
 * @route   PUT /api/conversations/:id/end
 * @desc    End a conversation
 * @access  Private
 */
router.put('/:id/end', auth, [
  param('id').isMongoId().withMessage('Invalid conversation ID'),
], asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    ...(req.user?._id ? { user: req.user._id } : {}), // In dev mode, allow any user if no user set
  });

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found',
    });
  }

  conversation.endConversation();

  let sessionReview = null;
  if (conversation.conversationType) {
    try {
      const history = conversation.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }));
      sessionReview = await aiTutorService.generateRoleplaySessionReview(
        history,
        conversation.language,
        conversation.conversationType
      );
    } catch (reviewErr) {
      console.warn('Roleplay session review failed:', reviewErr.message);
    }
  }

  await conversation.save();

  // Update user stats
  req.user.stats.totalMinutesPracticed += conversation.stats.durationMinutes;
  await req.user.save();

  const baseSummary = conversation.getSummary();
  res.json({
    success: true,
    message: 'Conversation ended',
    data: {
      summary: {
        ...baseSummary,
        ...(sessionReview ? { sessionReview } : {}),
      },
    },
  });
}));

/**
 * @route   DELETE /api/conversations/:id
 * @desc    Delete a conversation
 * @access  Private
 */
router.delete('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid conversation ID'),
], asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found',
    });
  }

  res.json({
    success: true,
    message: 'Conversation deleted',
  });
}));

// Helper function to save vocabulary words
async function saveVocabularyWords(userId, language, words, conversationId) {
  for (const word of words) {
    try {
      await Vocabulary.findOneAndUpdate(
        { user: userId, language, word: word.word },
        {
          $setOnInsert: {
            user: userId,
            language,
            word: word.word,
            translation: word.translation,
            pronunciation: word.pronunciation,
            source: 'conversation',
            conversationId,
          },
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      // Ignore duplicate key errors
      if (error.code !== 11000) {
        console.error('Failed to save vocabulary word:', error);
      }
    }
  }
}

module.exports = router;

