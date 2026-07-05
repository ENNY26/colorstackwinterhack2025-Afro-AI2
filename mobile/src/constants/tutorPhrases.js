/**
 * Phrases per language and category for Tutor Mode.
 * Each item: { native: string, english: string }
 * Used for "In [lang] we say X as in Y. Now try saying X."
 */
const YORUBA_PHRASES = {
  Greetings: [
    { native: 'Ẹ kú àárọ̀', english: 'Good morning' },
    { native: 'Ẹ kú ọ̀sán', english: 'Good afternoon' },
    { native: 'Ẹ kú alẹ̀', english: 'Good evening' },
    { native: 'Báwo ni?', english: 'How are you?' },
    { native: 'Dáadáa ni', english: 'I am fine' },
    { native: 'Ẹ ṣe', english: 'Thank you' },
    { native: 'Kóò tún rí', english: 'See you again' },
  ],
  Introductions: [
    { native: 'Orukọ mi ni...', english: 'My name is...' },
    { native: 'Ṣe o ṣe?', english: 'How do you do?' },
    { native: 'Inú mi dùn láti mọ ọ', english: 'Nice to meet you' },
    { native: 'Ẹ ku ilé', english: 'Welcome' },
  ],
  Numbers: [
    { native: 'Ọ̀kan', english: 'One' },
    { native: 'Èjì', english: 'Two' },
    { native: 'Ẹ̀ta', english: 'Three' },
    { native: 'Ẹ̀rin', english: 'Four' },
    { native: 'Àrún', english: 'Five' },
    { native: 'Ẹ̀fà', english: 'Six' },
    { native: 'Èje', english: 'Seven' },
    { native: 'Ẹ̀jọ', english: 'Eight' },
    { native: 'Ẹ̀sán', english: 'Nine' },
    { native: 'Ẹ̀wá', english: 'Ten' },
  ],
  Food: [
    { native: 'E jẹ', english: 'Let\'s eat' },
    { native: 'Oúnjẹ dùn', english: 'The food is sweet' },
    { native: 'E ku oúnjẹ', english: 'Enjoy your meal' },
    { native: 'Mo fẹ́ omi', english: 'I want water' },
  ],
  Travel: [
    { native: 'Nibo ni ọjà?', english: 'Where is the market?' },
    { native: 'Ẹ ṣe', english: 'Thank you' },
    { native: 'Ẹ jọwọ', english: 'Please' },
    { native: 'Mo wá láti...', english: 'I am from...' },
  ],
  Shopping: [
    { native: 'Eleyi ni owó melo?', english: 'How much is this?' },
    { native: 'Ó pọ̀ jù', english: 'It\'s too expensive' },
    { native: 'Mo ra', english: 'I will buy' },
  ],
  Directions: [
    { native: 'Lọ si ọtún', english: 'Go right' },
    { native: 'Lọ si osi', english: 'Go left' },
    { native: 'Lọ niwaju', english: 'Go straight' },
  ],
  Time: [
    { native: 'Àkókò wo?', english: 'What time?' },
    { native: 'Àárọ̀', english: 'Morning' },
    { native: 'Ọ̀sán', english: 'Afternoon' },
    { native: 'Alẹ̀', english: 'Evening' },
  ],
  Family: [
    { native: 'Bàbá', english: 'Father' },
    { native: 'Ìyá', english: 'Mother' },
    { native: 'Arábìnrin', english: 'Sister' },
    { native: 'Arákùnrin', english: 'Brother' },
  ],
  Work: [
    { native: 'Iṣẹ́ wo ni o ṣe?', english: 'What work do you do?' },
    { native: 'Mo jẹ́...', english: 'I am a...' },
    { native: 'Ẹ ku iṣẹ́', english: 'Good work / Well done' },
  ],
  Emergency: [
    { native: 'Ẹ ran mí', english: 'Help me' },
    { native: 'E pe dokita', english: 'Call a doctor' },
    { native: 'Ìpọnju wa', english: 'We have an emergency' },
  ],
  Phrases: [
    { native: 'Ko sí wahala', english: 'No problem' },
    { native: 'Jọwọ', english: 'Please' },
    { native: 'Ẹ ṣe', english: 'Thank you' },
    { native: 'Ẹ ma binu', english: 'Sorry / Excuse me' },
  ],
  Questions: [
    { native: 'Kí ni?', english: 'What?' },
    { native: 'Nibo?', english: 'Where?' },
    { native: 'Ìgbà wo?', english: 'When?' },
    { native: 'Ta ni?', english: 'Who?' },
  ],
  Colors: [
    { native: 'Pupa', english: 'Red' },
    { native: 'Funfun', english: 'White' },
    { native: 'Dudu', english: 'Black' },
    { native: 'Àwo ewé', english: 'Green' },
    { native: 'Àwo òfuurufu', english: 'Blue' },
  ],
  Weather: [
    { native: 'Ọjọ́ rẹ', english: 'Sunny day' },
    { native: 'Ó jo', english: 'It is raining' },
    { native: 'Ọjọ́ tutù', english: 'Cold day' },
  ],
};

// Full Swahili phrase set — parity with Yoruba coverage across all categories.
const SWAHILI_PHRASES = {
  Greetings: [
    { native: 'Habari za asubuhi', english: 'Good morning' },
    { native: 'Habari za mchana', english: 'Good afternoon' },
    { native: 'Habari za jioni', english: 'Good evening' },
    { native: 'Habari gani?', english: 'How are you?' },
    { native: 'Nzuri', english: 'I am fine' },
    { native: 'Asante', english: 'Thank you' },
    { native: 'Tutaonana', english: 'See you again' },
  ],
  Introductions: [
    { native: 'Jina langu ni...', english: 'My name is...' },
    { native: 'Unaitwaje?', english: 'What is your name?' },
    { native: 'Nimefurahi kukutana nawe', english: 'Nice to meet you' },
    { native: 'Karibu', english: 'Welcome' },
  ],
  Numbers: [
    { native: 'Moja', english: 'One' },
    { native: 'Mbili', english: 'Two' },
    { native: 'Tatu', english: 'Three' },
    { native: 'Nne', english: 'Four' },
    { native: 'Tano', english: 'Five' },
    { native: 'Sita', english: 'Six' },
    { native: 'Saba', english: 'Seven' },
    { native: 'Nane', english: 'Eight' },
    { native: 'Tisa', english: 'Nine' },
    { native: 'Kumi', english: 'Ten' },
  ],
  Food: [
    { native: 'Tule', english: "Let's eat" },
    { native: 'Chakula kitamu', english: 'The food is delicious' },
    { native: 'Karibu chakula', english: 'Enjoy your meal' },
    { native: 'Nataka maji', english: 'I want water' },
  ],
  Travel: [
    { native: 'Soko liko wapi?', english: 'Where is the market?' },
    { native: 'Asante', english: 'Thank you' },
    { native: 'Tafadhali', english: 'Please' },
    { native: 'Ninatoka...', english: 'I am from...' },
  ],
  Shopping: [
    { native: 'Hii ni bei gani?', english: 'How much is this?' },
    { native: 'Ni ghali sana', english: "It's too expensive" },
    { native: 'Nitanunua', english: 'I will buy' },
  ],
  Directions: [
    { native: 'Nenda kulia', english: 'Go right' },
    { native: 'Nenda kushoto', english: 'Go left' },
    { native: 'Nenda moja kwa moja', english: 'Go straight' },
  ],
  Time: [
    { native: 'Saa ngapi?', english: 'What time?' },
    { native: 'Asubuhi', english: 'Morning' },
    { native: 'Mchana', english: 'Afternoon' },
    { native: 'Jioni', english: 'Evening' },
  ],
  Family: [
    { native: 'Baba', english: 'Father' },
    { native: 'Mama', english: 'Mother' },
    { native: 'Dada', english: 'Sister' },
    { native: 'Kaka', english: 'Brother' },
  ],
  Work: [
    { native: 'Unafanya kazi gani?', english: 'What work do you do?' },
    { native: 'Mimi ni...', english: 'I am a...' },
    { native: 'Hongera kwa kazi', english: 'Well done' },
  ],
  Emergency: [
    { native: 'Nisaidie', english: 'Help me' },
    { native: 'Mwite daktari', english: 'Call a doctor' },
    { native: 'Kuna dharura', english: 'There is an emergency' },
  ],
  Phrases: [
    { native: 'Hakuna shida', english: 'No problem' },
    { native: 'Tafadhali', english: 'Please' },
    { native: 'Asante', english: 'Thank you' },
    { native: 'Samahani', english: 'Sorry / Excuse me' },
  ],
  Questions: [
    { native: 'Nini?', english: 'What?' },
    { native: 'Wapi?', english: 'Where?' },
    { native: 'Lini?', english: 'When?' },
    { native: 'Nani?', english: 'Who?' },
  ],
  Colors: [
    { native: 'Nyekundu', english: 'Red' },
    { native: 'Nyeupe', english: 'White' },
    { native: 'Nyeusi', english: 'Black' },
    { native: 'Kijani', english: 'Green' },
    { native: 'Bluu', english: 'Blue' },
  ],
  Weather: [
    { native: 'Siku ya jua', english: 'Sunny day' },
    { native: 'Mvua inanyesha', english: 'It is raining' },
    { native: 'Siku ya baridi', english: 'Cold day' },
  ],
};

const PHRASES_BY_LANGUAGE = {
  yoruba: YORUBA_PHRASES,
  swahili: SWAHILI_PHRASES,
  hausa: {}, // expand as needed
  zulu: {},
  amharic: {},
  igbo: {},
  xhosa: {},
  akan: {},
};

export function getPhrasesForCategory(languageId, category) {
  const lang = (languageId || 'yoruba').toLowerCase();
  const phrases = PHRASES_BY_LANGUAGE[lang] || YORUBA_PHRASES;
  return phrases[category] || YORUBA_PHRASES[category] || YORUBA_PHRASES.Greetings;
}

export const TUTOR_CATEGORIES = [
  'Greetings',
  'Introductions',
  'Numbers',
  'Food',
  'Travel',
  'Shopping',
  'Directions',
  'Time',
  'Family',
  'Work',
  'Emergency',
  'Phrases',
  'Questions',
  'Colors',
  'Weather',
];
