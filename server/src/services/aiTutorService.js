const OpenAI = require('openai');
const axios = require('axios');
const { AI_PERSONALITIES, AFRICAN_LANGUAGES, CONVERSATION_TYPES } = require('../config/constants');

/**
 * Claude Model Configuration:
 * Set CLAUDE_MODEL in .env to choose the model:
 * - claude-sonnet-4-5 (default): Best balance of speed and intelligence ($3/$15 per MTok)
 * - claude-haiku-4-5: Fastest and most affordable ($1/$5 per MTok) 
 * - claude-opus-4-5: Maximum intelligence, premium ($5/$25 per MTok)
 * 
 * Example: CLAUDE_MODEL=claude-sonnet-4-5
 */

// OpenAI client, created lazily so the server still starts without an
// OPENAI_API_KEY (e.g. when using Anthropic for chat and Groq for transcription).
let openaiClient = null;
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Generate system prompt for AI tutor or roleplay NPC
 * @param {string} language - Target language ID
 * @param {string} personalityId - Personality ID
 * @param {{ mode?: 'practice' | 'roleplay' }} [options]
 * @returns {string} System prompt
 */
const generateSystemPrompt = (language, personalityId, options = {}) => {
  const languageInfo = AFRICAN_LANGUAGES[language];
  const personality = AI_PERSONALITIES[personalityId] || AI_PERSONALITIES.friendly;
  const mode = options.mode || 'practice';

  if (mode === 'roleplay') {
    return `You are a native speaker playing ONE character in a real-life scenario in ${languageInfo.name} (${languageInfo.nativeName}).

Character vibe (only through natural speech in ${languageInfo.name}, never as a teacher): ${personality.description}

ROLEPLAY RULES — follow strictly:
1. Speak ONLY in ${languageInfo.name}. Do not use English anywhere in your SPOKEN reply — no English sentences, no English in parentheses, no translations, no glosses, no mixed-language lines. (The only exception is the hidden vocab note described in rule 7.)
2. Stay in the scene: short, natural replies like a real conversation. React to what the other person said.
3. Do NOT act as a language tutor. Forbidden (never output these patterns): praise or feedback like "good job", "great job", "well done", "nice", "excellent", "perfect", "very good", "that's right", comments about what they "said" or "used" or "pronounced", tips like "try to" / "remember to", or any coaching tone. No *asterisks*, [brackets], or teacher asides in the spoken reply.
4. If the user pasted a phrase from help / "I'm stuck" suggestions, treat it as their normal in-character line — answer in ${languageInfo.name} only, as the NPC would, with zero meta-commentary about the phrase.
5. If the user is stuck or uses English, continue the scene in ${languageInfo.name} only (e.g. repeat a question, offer a simple choice).
6. Keep each reply to a few sentences unless the scene needs more.
7. AFTER your spoken reply, on a brand-new final line, add a hidden vocab note listing up to 2 useful/new ${languageInfo.name} words you just used, in EXACTLY this format and nothing else:
[[VOCAB]] word = short English meaning; word2 = short English meaning [[/VOCAB]]
This line is stripped out before the user sees or hears it, so it never breaks the scene. It is the ONLY place English is allowed. Pick words a learner would benefit from. If you used no noteworthy words, output [[VOCAB]][[/VOCAB]].`;
  }

  return `You are an AI language tutor helping users learn ${languageInfo.name} (${languageInfo.nativeName}).

${personality.systemPrompt}

Important guidelines:
1. Always respond primarily in ${languageInfo.name}, with English translations in parentheses when needed.
2. Be culturally aware and share relevant cultural context when appropriate.
3. Correct mistakes gently and provide the correct form.
4. Use simple vocabulary for beginners and gradually increase complexity.
5. Include pronunciation tips when teaching new words.
6. Encourage the learner and celebrate their progress.
7. When the user speaks in ${languageInfo.name}, respond naturally to continue the conversation.
8. When the user speaks in English, help them translate and practice in ${languageInfo.name}.
9. Include relevant greetings and cultural expressions.
10. If you teach a new word, include the word, its translation, and pronunciation guide.

Start conversations warmly with an appropriate greeting in ${languageInfo.name}.`;
};

/** Keep roleplay context small for faster LLM turns. */
function trimConversationHistory(messages, maxMessages = 12) {
  if (!messages || messages.length <= maxMessages) return messages;
  return messages.slice(-maxMessages);
}

function getModelForMode(provider, mode) {
  const isRoleplay = mode === 'roleplay';
  if (provider === 'anthropic') {
    if (isRoleplay) {
      return process.env.CLAUDE_ROLEPLAY_MODEL || 'claude-haiku-4-5';
    }
    return process.env.CLAUDE_MODEL || 'claude-sonnet-4-5';
  }
  if (isRoleplay) {
    return process.env.OPENAI_ROLEPLAY_MODEL || 'gpt-4o-mini';
  }
  return process.env.OPENAI_CHAT_MODEL || 'gpt-4-turbo-preview';
}

/**
 * Generate AI response using OpenAI GPT
 * @param {Array} messages - Conversation history
 * @param {string} language - Target language ID
 * @param {string} personalityId - Personality ID
 * @returns {Promise<{response: string, vocabularyWords: Array}>}
 */
const generateResponseOpenAI = async (messages, language, personalityId, options = {}) => {
  try {
    const systemPrompt = generateSystemPrompt(language, personalityId, options);

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    const isRoleplay = options.mode === 'roleplay';
    const provider = 'openai';
    const completion = await getOpenAI().chat.completions.create({
      model: getModelForMode(provider, options.mode),
      messages: formattedMessages,
      temperature: isRoleplay ? 0.35 : 0.7,
      max_tokens: isRoleplay ? 280 : 500,
      presence_penalty: isRoleplay ? 0 : 0.1,
      frequency_penalty: isRoleplay ? 0 : 0.1,
    });

    const rawResponse = completion.choices[0].message.content;

    const { response, vocabularyWords } = buildVocabResult(
      rawResponse,
      language,
      options.mode
    );

    return {
      response,
      vocabularyWords,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`Failed to generate AI response: ${error.message}`);
  }
};

/**
 * Generate AI response using Anthropic Claude
 * @param {Array} messages - Conversation history
 * @param {string} language - Target language ID
 * @param {string} personalityId - Personality ID
 * @returns {Promise<{response: string, vocabularyWords: Array}>}
 */
const generateResponseClaude = async (messages, language, personalityId, options = {}) => {
  try {
    const systemPrompt = generateSystemPrompt(language, personalityId, options);

    // Claude requires at least one user message. If empty, add a welcome message
    let formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    // If no messages, add a welcome message to initiate conversation
    if (formattedMessages.length === 0) {
      const languageInfo = AFRICAN_LANGUAGES[language];
      formattedMessages = [{
        role: 'user',
        content: options.mode === 'roleplay'
          ? `Begin the scene in ${languageInfo.name} only, in character. No English.`
          : `Hello! I want to start learning ${languageInfo.name}. Please greet me and help me begin.`,
      }];
    }

    // Use Claude 4.5 models - configurable via environment variable
    // Options: claude-sonnet-4-5, claude-haiku-4-5, claude-opus-4-5
    // Default: claude-sonnet-4-5 (best balance of speed and intelligence)
    const claudeModel = getModelForMode('anthropic', options.mode);

    const isRoleplay = options.mode === 'roleplay';
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: claudeModel,
        max_tokens: isRoleplay ? 280 : 500,
        temperature: isRoleplay ? 0.35 : 0.7,
        system: systemPrompt,
        messages: formattedMessages,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        timeout: isRoleplay ? 60000 : 120000,
      }
    );

    const aiResponse = response.data.content[0].text;
    const { response: cleanResponse, vocabularyWords } = buildVocabResult(
      aiResponse,
      language,
      options.mode
    );

    return {
      response: cleanResponse,
      vocabularyWords,
    };
  } catch (error) {
    console.error('Anthropic API error:', error.response?.data || error);
    throw new Error(`Failed to generate AI response: ${error.message}`);
  }
};

/**
 * Main function to generate AI response
 * Uses configured provider (OpenAI or Anthropic)
 */
const generateResponse = async (messages, language, personalityId, options = {}) => {
  const provider = process.env.AI_PROVIDER || 'openai';
  const history =
    options.mode === 'roleplay' ? trimConversationHistory(messages) : messages;

  if (provider === 'anthropic') {
    return generateResponseClaude(history, language, personalityId, options);
  }

  return generateResponseOpenAI(history, language, personalityId, options);
};

/**
 * Generate suggested responses for "Help Me Respond" feature
 * @param {Array} messages - Conversation history
 * @param {string} language - Target language ID
 * @returns {Promise<Array>} Array of suggested responses
 */
const generateSuggestedResponses = async (messages, language, options = {}) => {
  try {
    const languageInfo = AFRICAN_LANGUAGES[language];
    const provider = process.env.AI_PROVIDER || 'openai';
    const isRoleplay = options.mode === 'roleplay';

    const prompt = isRoleplay
      ? `The learner is in a live voice ROLEPLAY in ${languageInfo.name}. They are stuck and need the next thing THEIR CHARACTER should say — natural, short, in-scene. Do NOT write as a teacher, coach, or narrator. No praise, no tips.

Format each suggestion as:
SUGGESTION 1: [${languageInfo.name} line only] | [English gloss for the learner to read]
SUGGESTION 2: [${languageInfo.name} line only] | [English gloss for the learner to read]
SUGGESTION 3: [${languageInfo.name} line only] | [English gloss for the learner to read]

Keep each ${languageInfo.name} line to one short sentence when possible.`
      : `Based on this conversation, suggest 3 simple responses in ${languageInfo.name} that a beginner learner could use. 

Format each suggestion as:
SUGGESTION 1: [${languageInfo.name} text] | [English translation]
SUGGESTION 2: [${languageInfo.name} text] | [English translation]
SUGGESTION 3: [${languageInfo.name} text] | [English translation]

Keep suggestions simple and appropriate for the conversation context.`;

    if (provider === 'anthropic') {
      // Use Anthropic for suggestions
      const formattedMessages = [
        ...messages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })),
        { role: 'user', content: prompt },
      ];

      // Use same Claude model as configured for main responses
      const claudeModel = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5';
      
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: claudeModel,
          max_tokens: 300,
          messages: formattedMessages,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
        }
      );

      const responseText = response.data.content[0].text;
      const suggestions = parseSuggestedResponses(responseText);
      return suggestions;
    } else {
      // Use OpenAI for suggestions
      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          ...messages.map(msg => ({ role: msg.role, content: msg.content })),
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 300,
      });

      const responseText = completion.choices[0].message.content;
      const suggestions = parseSuggestedResponses(responseText);
      return suggestions;
    }
  } catch (error) {
    console.error('Failed to generate suggestions:', error);
    return [];
  }
};

/**
 * Extract a hidden roleplay vocab note and strip it from the spoken reply.
 * The roleplay model appends `[[VOCAB]] word = meaning; word2 = meaning [[/VOCAB]]`
 * which we remove (so it's never shown/spoken) and turn into vocab entries.
 * @returns {{ clean: string, vocabularyWords: Array<{word:string,translation:string,pronunciation:null}> }}
 */
const extractTaggedVocab = (response) => {
  const vocabularyWords = [];
  let clean = String(response || '');

  const blockRe = /\[\[VOCAB\]\]([\s\S]*?)(?:\[\[\/VOCAB\]\]|$)/i;
  const match = clean.match(blockRe);
  if (match) {
    const inner = match[1] || '';
    clean = clean.replace(blockRe, '').trim();

    for (const pair of inner.split(/[;\n]+/)) {
      const eq = pair.indexOf('=');
      if (eq === -1) continue;
      const word = pair.slice(0, eq).trim();
      const translation = pair.slice(eq + 1).trim();
      if (
        word.length > 1 &&
        word.length < 50 &&
        translation.length > 1 &&
        translation.length < 100
      ) {
        vocabularyWords.push({ word, translation, pronunciation: null });
      }
    }
  }

  return { clean, vocabularyWords };
};

/**
 * Turn a raw AI reply into the cleaned response + extracted vocab, per mode.
 * - roleplay: parse + strip the hidden [[VOCAB]] note (keeps the scene immersive)
 * - practice: extract `word (translation)` pairs inline as before
 */
const buildVocabResult = (rawResponse, language, mode) => {
  if (mode === 'roleplay') {
    const { clean, vocabularyWords } = extractTaggedVocab(rawResponse);
    return { response: clean, vocabularyWords };
  }
  return {
    response: rawResponse,
    vocabularyWords: extractVocabularyFromResponse(rawResponse, language),
  };
};

/**
 * Extract vocabulary words from AI response
 */
const extractVocabularyFromResponse = (response, language) => {
  const vocabularyWords = [];

  // Pattern to find words with translations in parentheses
  // e.g., "Bawo ni (How are you)"
  const pattern = /([^\s(]+(?:\s+[^\s(]+)*)\s*\(([^)]+)\)/g;
  let match;

  while ((match = pattern.exec(response)) !== null) {
    const word = match[1].trim();
    const translation = match[2].trim();

    // Only add if both are present and reasonable length
    if (word.length > 1 && word.length < 50 && translation.length > 1 && translation.length < 100) {
      vocabularyWords.push({
        word,
        translation,
        pronunciation: null, // Could be extracted or generated separately
      });
    }
  }

  return vocabularyWords;
};

/**
 * Parse suggested responses from AI output
 */
const parseSuggestedResponses = (responseText) => {
  const suggestions = [];
  const lines = responseText.split('\n');

  for (const line of lines) {
    const suggestionMatch = line.match(/SUGGESTION \d+:\s*(.+)\s*\|\s*(.+)/i);
    if (suggestionMatch) {
      suggestions.push({
        original: suggestionMatch[1].trim(),
        translation: suggestionMatch[2].trim(),
      });
    }
  }

  return suggestions.slice(0, 3);
};

/**
 * Translate text between languages
 */
/**
 * After roleplay ends: bilingual recap, pronunciation tips, natural phrasing (tutor tone OK here only).
 */
const generateRoleplaySessionReview = async (messages, language, conversationType) => {
  const languageInfo = AFRICAN_LANGUAGES[language];
  const scenarioLabel =
    conversationType && CONVERSATION_TYPES[conversationType]
      ? CONVERSATION_TYPES[conversationType]
      : 'Roleplay';
  const transcript = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const userPrompt = `The learner finished a voice roleplay in ${languageInfo.name}. Scenario: "${scenarioLabel}".

Transcript:
${transcript}

Write a POST-SESSION review. This is NOT in-scene dialogue — tutoring and English explanations are OK here.

Include:
1. Brief warm encouragement, mixing ${languageInfo.name} with English glosses in parentheses where helpful.
2. A few sample phrases from the chat (or closely related) with English glosses.
3. A "**Pronunciation tip:**" section with 2–4 words that appeared in the dialogue and simple syllable-style hints.
4. A "**Natural phrasing:**" section: compare more natural ${languageInfo.name} to what the learner said when relevant, grounded in this transcript (bullet points).
5. Optional short closing practice prompts in ${languageInfo.name} with English glosses.

Use markdown headings where helpful.`;

  const provider = process.env.AI_PROVIDER || 'openai';

  if (provider === 'anthropic') {
    const claudeModel = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5';
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: claudeModel,
        max_tokens: 2000,
        system:
          'You write clear, encouraging post-session summaries for language learners after roleplay. Follow the user structure.',
        messages: [{ role: 'user', content: userPrompt }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
      }
    );
    return response.data.content[0].text.trim();
  }

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content:
          'You write clear post-session summaries for language learners after roleplay. Follow the user structure.',
      },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.55,
    max_tokens: 2000,
  });

  return completion.choices[0].message.content.trim();
};

const translateText = async (text, fromLanguage, toLanguage) => {
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a translator. Translate the following text from ${fromLanguage} to ${toLanguage}. Only provide the translation, no explanations.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error(`Failed to translate: ${error.message}`);
  }
};

module.exports = {
  generateResponse,
  generateSuggestedResponses,
  extractVocabularyFromResponse,
  translateText,
  generateSystemPrompt,
  generateRoleplaySessionReview,
};

