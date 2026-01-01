// Supported African languages with metadata
const AFRICAN_LANGUAGES = {
  yoruba: {
    id: 'yoruba',
    name: 'Yoruba',
    nativeName: 'Èdè Yorùbá',
    nativeExample: 'Ẹ kú àárọ̀',
    flag: '🇳🇬',
    region: 'Nigeria',
    speakers: '45M+',
    voiceId: 'yoruba_voice_id', // ElevenLabs voice ID
  },
  swahili: {
    id: 'swahili',
    name: 'Swahili',
    nativeName: 'Kiswahili',
    nativeExample: 'Habari za asubuhi',
    flag: '🇹🇿',
    region: 'East Africa',
    speakers: '100M+',
    voiceId: 'swahili_voice_id',
  },
  hausa: {
    id: 'hausa',
    name: 'Hausa',
    nativeName: 'Harshen Hausa',
    nativeExample: 'Ina kwana',
    flag: '🇳🇬',
    region: 'West Africa',
    speakers: '70M+',
    voiceId: 'hausa_voice_id',
  },
  zulu: {
    id: 'zulu',
    name: 'Zulu',
    nativeName: 'isiZulu',
    nativeExample: 'Sawubona',
    flag: '🇿🇦',
    region: 'South Africa',
    speakers: '12M+',
    voiceId: 'zulu_voice_id',
  },
  amharic: {
    id: 'amharic',
    name: 'Amharic',
    nativeName: 'አማርኛ',
    nativeExample: 'ጤና ይስጥልኝ',
    flag: '🇪🇹',
    region: 'Ethiopia',
    speakers: '32M+',
    voiceId: 'amharic_voice_id',
  },
  igbo: {
    id: 'igbo',
    name: 'Igbo',
    nativeName: 'Asụsụ Igbo',
    nativeExample: 'Ụtụtụ ọma',
    flag: '🇳🇬',
    region: 'Nigeria',
    speakers: '45M+',
    voiceId: 'igbo_voice_id',
  },
  xhosa: {
    id: 'xhosa',
    name: 'Xhosa',
    nativeName: 'isiXhosa',
    nativeExample: 'Molo',
    flag: '🇿🇦',
    region: 'South Africa',
    speakers: '8M+',
    voiceId: 'xhosa_voice_id',
  },
  akan: {
    id: 'akan',
    name: 'Akan',
    nativeName: 'Akan',
    nativeExample: 'Maakye',
    flag: '🇬🇭',
    region: 'Ghana',
    speakers: '11M+',
    voiceId: 'akan_voice_id',
  },
};

// AI Tutor personalities
const AI_PERSONALITIES = {
  quirky: {
    id: 'quirky',
    name: 'Quirky & Fun',
    emoji: '🎉',
    description: 'Learning with jokes and playful banter',
    systemPrompt: 'You are a fun, quirky language tutor who uses humor and playful language to teach. Make learning enjoyable with jokes and light-hearted banter while still being educational.',
  },
  professional: {
    id: 'professional',
    name: 'Serious & Professional',
    emoji: '📚',
    description: 'Structured lessons with clear explanations',
    systemPrompt: 'You are a professional, academic language tutor. Provide structured, clear explanations with proper grammar rules and formal teaching methods.',
  },
  friendly: {
    id: 'friendly',
    name: 'Friendly & Casual',
    emoji: '😊',
    description: 'Like chatting with a supportive friend',
    systemPrompt: 'You are a friendly, casual language tutor. Teach like you are having a conversation with a good friend - warm, supportive, and encouraging.',
  },
  patient: {
    id: 'patient',
    name: 'Patient & Encouraging',
    emoji: '🌟',
    description: 'Gentle pace with lots of positive reinforcement',
    systemPrompt: 'You are an extremely patient and encouraging language tutor. Take things slowly, celebrate every small win, and never make the learner feel bad about mistakes.',
  },
  humorous: {
    id: 'humorous',
    name: 'Humorous',
    emoji: '😄',
    description: 'Comedy-filled learning adventure',
    systemPrompt: 'You are a comedic language tutor who uses humor, funny stories, and amusing examples to teach. Keep the learner entertained while they learn.',
  },
};

// Conversation types
const CONVERSATION_TYPES = {
  casual: 'Casual conversation practice',
  greetings: 'Greetings and introductions',
  numbers: 'Numbers and counting',
  family: 'Family and relationships',
  food: 'Food and dining',
  travel: 'Travel and directions',
  shopping: 'Shopping and bargaining',
  culture: 'Cultural expressions and proverbs',
};

// Voice speed options
const VOICE_SPEEDS = {
  slow: 0.75,
  normal: 1.0,
  fast: 1.25,
};

module.exports = {
  AFRICAN_LANGUAGES,
  AI_PERSONALITIES,
  CONVERSATION_TYPES,
  VOICE_SPEEDS,
};

