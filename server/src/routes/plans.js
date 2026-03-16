const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { aiTutorService } = require('../services');
const { AFRICAN_LANGUAGES } = require('../config/constants');

const router = express.Router();

/**
 * @route POST /api/plans
 * @desc  Generate a personalized learning plan and lessons using AI
 * @access Private
 */
router.post('/', auth, [
  body('language').isIn(Object.keys(AFRICAN_LANGUAGES)).withMessage('Invalid language'),
  body('level').optional().isString(),
  body('reason').optional().isString(),
  body('dailyGoal').optional().isInt({ min: 1, max: 1440 }),
  body('focusArea').optional().isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }

  const { language, level = 'beginner', reason = 'general', dailyGoal = 15, focusArea = 'speaking' } = req.body;

  const languageInfo = AFRICAN_LANGUAGES[language];

  const categoryList = 'Greetings, Introductions, Numbers, Food, Travel, Shopping, Directions, Time, Family, Work, Emergency, Common Phrases, Questions, Colors, Weather';

  const prompt = `You are creating a personalized ${languageInfo.name} (${languageInfo.nativeName}) learning plan.

Learner profile:
- Level: ${level}
- Why they want to learn: ${reason}
- Daily goal: ${dailyGoal} minutes per day
- Area to improve most: ${focusArea}

Return ONLY valid JSON (no markdown, no extra text) with this exact structure:
{
  "summary": "2-3 sentences: a warm, personalized summary of their plan based on their level, goal (${reason}), and focus (${focusArea}). Mention the language by name.",
  "dailyMinutes": ${dailyGoal},
  "weeks": 4,
  "lessons": [
    {
      "id": "lesson-1",
      "title": "Greetings",
      "durationMinutes": 5,
      "steps": [
        { "type": "repeat", "content": "exact phrase in ${languageInfo.name}", "english": "short English meaning" }
      ]
    }
  ]
}

Rules:
- Include exactly 15 lessons. Each lesson "title" must be exactly one of: ${categoryList}. Use "Common Phrases" not "Phrases".
- For each lesson, provide 4-7 "steps". Each step must have "content" (the phrase in ${languageInfo.name} only - use correct script/accents) and "english" (brief English translation). Use type "repeat" for all steps.
- Phrases must be authentic ${languageInfo.name} (e.g. correct Yoruba diacritics, Swahili spelling). No romanization of other scripts unless the language is written in Latin script.
- Order lessons: start with Greetings, then Introductions, Numbers, then the rest in the list order.
- summary must reflect their reason (${reason}) and focus area (${focusArea}).`;

  // Use aiTutorService.generateResponse which will select the provider configured
  const messages = [{ role: 'user', content: prompt }];

  try {
    const { response } = await aiTutorService.generateResponse(messages, language, req.user?.aiPersonality || 'friendly');

    // Try to parse JSON from response (expect strict JSON as instructed)
    let plan = null;
    try {
      plan = JSON.parse(response);
    } catch (jsonErr) {
      // If parsing fails, attempt to extract JSON block
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        try { plan = JSON.parse(match[0]); } catch (e) { /* fall through */ }
      }
    }

    if (!plan) {
      return res.status(200).json({ success: true, data: { raw: response }, warning: 'AI did not return strict JSON. See raw.' });
    }

    // Normalize plan for the app: attach request fields and ensure lessons/steps shape
    const normalized = {
      ...plan,
      language,
      languageName: languageInfo.name,
      level,
      reason,
      focusArea,
      dailyGoal: plan.dailyMinutes ?? dailyGoal,
      lessons: (plan.lessons || []).map((les, i) => ({
        id: les.id || `lesson-${i + 1}`,
        title: les.title || 'Lesson',
        durationMinutes: les.durationMinutes || 5,
        steps: (les.steps || []).map((s) => ({
          type: s.type || 'repeat',
          content: s.content || '',
          english: s.english || s.translation || '',
        })).filter((s) => s.content),
      })),
    };

    return res.status(200).json({ success: true, data: { plan: normalized } });
  } catch (err) {
    console.error('Failed to generate plan:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate plan' });
  }
}));

module.exports = router;
