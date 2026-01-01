require('dotenv').config();
const mongoose = require('mongoose');
const CulturalTip = require('../models/CulturalTip');

// Cultural tips data for seeding
const culturalTipsData = [
  // Yoruba tips
  {
    language: 'yoruba',
    tip: "In Yoruba, it's more common to say 'E ku aro' than 'Aro' alone for good morning - the 'E' shows respect!",
    type: 'grammar',
    emoji: '💡',
    difficulty: 'beginner',
  },
  {
    language: 'yoruba',
    tip: "Adding 'o' at the end of greetings shows respect to elders. Example: 'E káàbọ̀ o!'",
    type: 'culture',
    emoji: '📚',
    difficulty: 'beginner',
  },
  {
    language: 'yoruba',
    tip: "Yoruba is a tonal language - the same word can mean different things based on tone!",
    type: 'pronunciation',
    emoji: '🎵',
    difficulty: 'intermediate',
  },
  {
    language: 'yoruba',
    tip: "When greeting elders, it's customary to slightly bow or kneel in Yoruba culture.",
    type: 'etiquette',
    emoji: '🤝',
    difficulty: 'beginner',
  },
  {
    language: 'yoruba',
    tip: "'Ẹ ṣé' means 'thank you' but 'Ẹ ṣé púpọ̀' means 'thank you very much'!",
    type: 'vocabulary',
    emoji: '💬',
    difficulty: 'beginner',
  },
  {
    language: 'yoruba',
    tip: "Over 45 million people speak Yoruba, making it one of Africa's major languages!",
    type: 'fun_fact',
    emoji: '🌍',
    difficulty: 'beginner',
  },
  {
    language: 'yoruba',
    tip: "'Báwo ni' is informal. For elders, use 'Ẹ ká àárọ̀' (Good morning) or 'Ẹ kú ọ̀sán' (Good afternoon).",
    type: 'grammar',
    emoji: '👋',
    difficulty: 'beginner',
  },
  {
    language: 'yoruba',
    tip: "Yoruba proverbs (Òwe) are highly valued and often used in daily conversation.",
    type: 'culture',
    emoji: '🎭',
    difficulty: 'intermediate',
  },
  {
    language: 'yoruba',
    tip: "The letters ẹ, ọ, and ṣ are unique to Yoruba. They represent different sounds!",
    type: 'pronunciation',
    emoji: '📝',
    difficulty: 'beginner',
  },
  {
    language: 'yoruba',
    tip: "'Mo dúpẹ́' literally means 'I bow in gratitude' - showing the depth of Yoruba gratitude!",
    type: 'vocabulary',
    emoji: '🌅',
    difficulty: 'beginner',
  },
  
  // Swahili tips
  {
    language: 'swahili',
    tip: "'Jambo' is often used with tourists, while locals prefer 'Habari' for greetings.",
    type: 'culture',
    emoji: '👋',
    difficulty: 'beginner',
  },
  {
    language: 'swahili',
    tip: "Swahili has borrowed many words from Arabic, Portuguese, and English.",
    type: 'fun_fact',
    emoji: '📚',
    difficulty: 'intermediate',
  },
  {
    language: 'swahili',
    tip: "'Hakuna Matata' really does mean 'no worries' - it's a common phrase!",
    type: 'vocabulary',
    emoji: '😊',
    difficulty: 'beginner',
  },
  {
    language: 'swahili',
    tip: "Swahili uses noun classes instead of gender. There are about 18 noun classes!",
    type: 'grammar',
    emoji: '📝',
    difficulty: 'advanced',
  },
  {
    language: 'swahili',
    tip: "Swahili is spoken by over 100 million people across East Africa.",
    type: 'fun_fact',
    emoji: '🌍',
    difficulty: 'beginner',
  },
  
  // Hausa tips
  {
    language: 'hausa',
    tip: "'Sannu' is the all-purpose greeting in Hausa, suitable for any time of day.",
    type: 'vocabulary',
    emoji: '👋',
    difficulty: 'beginner',
  },
  {
    language: 'hausa',
    tip: "Hausa is written in both Arabic script (Ajami) and Latin alphabet (Boko).",
    type: 'fun_fact',
    emoji: '📝',
    difficulty: 'intermediate',
  },
  {
    language: 'hausa',
    tip: "Adding 'da' before a greeting makes it more formal and respectful.",
    type: 'etiquette',
    emoji: '🤝',
    difficulty: 'beginner',
  },
  
  // Zulu tips
  {
    language: 'zulu',
    tip: "'Sawubona' literally means 'I see you' - acknowledging someone's existence and dignity.",
    type: 'culture',
    emoji: '👁️',
    difficulty: 'beginner',
  },
  {
    language: 'zulu',
    tip: "Zulu has click consonants borrowed from Khoisan languages.",
    type: 'pronunciation',
    emoji: '🎵',
    difficulty: 'intermediate',
  },
  {
    language: 'zulu',
    tip: "The response to 'Sawubona' is 'Yebo, ngikhona' (Yes, I am here).",
    type: 'vocabulary',
    emoji: '💬',
    difficulty: 'beginner',
  },
  
  // Amharic tips
  {
    language: 'amharic',
    tip: "Amharic uses its own unique alphabet called Fidäl or Ge'ez script.",
    type: 'fun_fact',
    emoji: '📜',
    difficulty: 'beginner',
  },
  {
    language: 'amharic',
    tip: "'Selam' means peace and is used as a greeting, similar to Arabic 'Salaam'.",
    type: 'vocabulary',
    emoji: '✌️',
    difficulty: 'beginner',
  },
  {
    language: 'amharic',
    tip: "Coffee ceremonies are an important part of Ethiopian culture - 'Buna dabo naw' (Coffee is our bread).",
    type: 'culture',
    emoji: '☕',
    difficulty: 'beginner',
  },
  
  // Igbo tips
  {
    language: 'igbo',
    tip: "'Kedu' is the most common Igbo greeting, meaning 'How are you?'",
    type: 'vocabulary',
    emoji: '👋',
    difficulty: 'beginner',
  },
  {
    language: 'igbo',
    tip: "Igbo is a tonal language with two main tones: high and low.",
    type: 'pronunciation',
    emoji: '🎵',
    difficulty: 'intermediate',
  },
  {
    language: 'igbo',
    tip: "The Igbo have a strong tradition of proverbs (Ilu) in communication.",
    type: 'culture',
    emoji: '📚',
    difficulty: 'beginner',
  },
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing tips
    await CulturalTip.deleteMany({});
    console.log('Cleared existing cultural tips');

    // Insert new tips
    await CulturalTip.insertMany(culturalTipsData);
    console.log(`Inserted ${culturalTipsData.length} cultural tips`);

    console.log('Database seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();

