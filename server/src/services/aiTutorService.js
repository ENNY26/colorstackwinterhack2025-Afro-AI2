const OpenAI = require('openai');
const axios = require('axios');
const { AI_PERSONALITIES, AFRICAN_LANGUAGES } = require('../config/constants');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate system prompt for AI tutor
 * @param {string} language - Target language ID
 * @param {string} personalityId - Personality ID
 * @returns {string} System prompt
 */
const generateSystemPrompt = (language, personalityId) => {
  const languageInfo = AFRICAN_LANGUAGES[language];
  const personality = AI_PERSONALITIES[personalityId] || AI_PERSONALITIES.friendly;

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

/**
 * Generate AI response using OpenAI GPT
 * @param {Array} messages - Conversation history
 * @param {string} language - Target language ID
 * @param {string} personalityId - Personality ID
 * @returns {Promise<{response: string, vocabularyWords: Array}>}
 */
const generateResponseOpenAI = async (messages, language, personalityId) => {
  try {
    const systemPrompt = generateSystemPrompt(language, personalityId);

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 500,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const response = completion.choices[0].message.content;

    // Extract vocabulary words from response
    const vocabularyWords = extractVocabularyFromResponse(response, language);

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
const generateResponseClaude = async (messages, language, personalityId) => {
  try {
    const systemPrompt = generateSystemPrompt(language, personalityId);

    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        system: systemPrompt,
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

    const aiResponse = response.data.content[0].text;
    const vocabularyWords = extractVocabularyFromResponse(aiResponse, language);

    return {
      response: aiResponse,
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
const generateResponse = async (messages, language, personalityId) => {
  const provider = process.env.AI_PROVIDER || 'openai';

  if (provider === 'anthropic') {
    return generateResponseClaude(messages, language, personalityId);
  }

  return generateResponseOpenAI(messages, language, personalityId);
};

/**
 * Generate suggested responses for "Help Me Respond" feature
 * @param {Array} messages - Conversation history
 * @param {string} language - Target language ID
 * @returns {Promise<Array>} Array of suggested responses
 */
const generateSuggestedResponses = async (messages, language) => {
  try {
    const languageInfo = AFRICAN_LANGUAGES[language];

    const prompt = `Based on this conversation, suggest 3 simple responses in ${languageInfo.name} that a beginner learner could use. 

Format each suggestion as:
SUGGESTION 1: [${languageInfo.name} text] | [English translation]
SUGGESTION 2: [${languageInfo.name} text] | [English translation]
SUGGESTION 3: [${languageInfo.name} text] | [English translation]

Keep suggestions simple and appropriate for the conversation context.`;

    const completion = await openai.chat.completions.create({
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
  } catch (error) {
    console.error('Failed to generate suggestions:', error);
    return [];
  }
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
const translateText = async (text, fromLanguage, toLanguage) => {
  try {
    const completion = await openai.chat.completions.create({
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
};

