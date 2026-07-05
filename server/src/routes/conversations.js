const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Vocabulary = require('../models/Vocabulary');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { aiTutorService, ttsService } = require('../services');
const { transcribeWithProviders } = require('../services/transcribeProviders');
const { uploadAudio, deleteUploadedFile } = require('../middleware/upload');
const { AI_PERSONALITIES, AFRICAN_LANGUAGES, CONVERSATION_TYPES } = require('../config/constants');

const router = express.Router();

/**
 * Generate ElevenLabs audio for ALL modes (including roleplay) so African
 * languages are actually spoken — device TTS can't pronounce them.
 * Set ROLEPLAY_SKIP_SERVER_TTS=true only if you intentionally want device TTS.
 */
function shouldSkipServerTts() {
  return process.env.ROLEPLAY_SKIP_SERVER_TTS === 'true';
}

async function generateAssistantReply(conversation, userContent, req) {
  conversation.addMessage('user', userContent);

  const conversationHistory = conversation.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  const aiMode = conversation.conversationType ? 'roleplay' : 'practice';

  const { response: aiResponse, vocabularyWords } = await aiTutorService.generateResponse(
    conversationHistory,
    conversation.language,
    conversation.personality,
    { mode: aiMode }
  );

  let audioUrl = null;
  if (!shouldSkipServerTts()) {
    try {
      const audioResult = await ttsService.synthesize(aiResponse, {
        speed: req.user?.voiceSpeed || 'normal',
        language: conversation.language,
      });
      audioUrl = audioResult.audioUrl;
    } catch (audioError) {
      console.warn('⚠️ TTS failed (client will use fallback):', audioError.message);
    }
  }

  conversation.addMessage('assistant', aiResponse, { audioUrl, vocabularyWords });
  await conversation.save();

  if (vocabularyWords.length > 0 && req.user?._id) {
    const userId = req.user._id;
    const lang = conversation.language;
    const convId = conversation._id;
    const wordCount = vocabularyWords.length;
    setImmediate(() => {
      saveVocabularyWords(userId, lang, vocabularyWords, convId).catch((err) =>
        console.error('Background vocab save failed:', err)
      );
      User.findByIdAndUpdate(userId, { $inc: { 'stats.wordsLearned': wordCount } }).catch((err) =>
        console.error('Background user stats update failed:', err)
      );
    });
  }

  return {
    userContent,
    aiResponse,
    audioUrl,
    vocabularyWords,
  };
}

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

  let audioUrl = null;
  if (!shouldSkipServerTts()) {
    try {
      const voiceSpeed = req.user?.voiceSpeed || 'normal';
      const audioResult = await ttsService.synthesize(greeting, {
        speed: voiceSpeed,
        language,
      });
      audioUrl = audioResult.audioUrl;
    } catch (audioError) {
      console.warn('⚠️ Greeting TTS failed (client fallback):', audioError.message);
    }
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
  const { userContent, aiResponse, audioUrl, vocabularyWords } = await generateAssistantReply(
    conversation,
    content,
    req
  );

  res.json({
    success: true,
    data: {
      userMessage: {
        role: 'user',
        content: userContent,
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
 * @route   POST /api/conversations/:id/voice-message
 * @desc    Transcribe audio + AI reply in one request (faster roleplay turns)
 * @access  Private
 */
router.post('/:id/voice-message', auth, uploadAudio.single('audio'), [
  param('id').isMongoId().withMessage('Invalid conversation ID'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No audio file provided',
    });
  }

  const conversation = await Conversation.findOne({
    _id: req.params.id,
    ...(req.user?._id ? { user: req.user._id } : {}),
  });

  if (!conversation) {
    deleteUploadedFile(req.file.path);
    return res.status(404).json({ success: false, message: 'Conversation not found' });
  }

  if (conversation.status !== 'active') {
    deleteUploadedFile(req.file.path);
    return res.status(400).json({ success: false, message: 'Conversation is not active' });
  }

  const language = req.body.language || conversation.language;
  let transcribedText = '';

  try {
    const { text } = await transcribeWithProviders(req.file.path, language);
    transcribedText = String(text || '').trim();
    if (!transcribedText) {
      throw new Error('No speech detected');
    }
  } finally {
    deleteUploadedFile(req.file.path);
  }

  const { userContent, aiResponse, audioUrl, vocabularyWords } = await generateAssistantReply(
    conversation,
    transcribedText,
    req
  );

  res.json({
    success: true,
    data: {
      transcription: transcribedText,
      userMessage: {
        role: 'user',
        content: userContent,
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

