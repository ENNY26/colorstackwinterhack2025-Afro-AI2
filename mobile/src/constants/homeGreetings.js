/**
 * Time-based greetings in African languages (native phrase, English).
 * Used on Home for the chosen language.
 */
const GREETINGS_BY_LANGUAGE = {
  yoruba: {
    morning: { native: 'Ẹ kú àárọ̀', english: 'Good morning' },
    afternoon: { native: 'Ẹ kú ọ̀sán', english: 'Good afternoon' },
    evening: { native: 'Ẹ kú alẹ̀', english: 'Good evening' },
  },
  swahili: {
    morning: { native: 'Habari za asubuhi', english: 'Good morning' },
    afternoon: { native: 'Habari za mchana', english: 'Good afternoon' },
    evening: { native: 'Habari za jioni', english: 'Good evening' },
  },
  hausa: {
    morning: { native: 'Ina kwana', english: 'Good morning' },
    afternoon: { native: 'Ina wuni', english: 'Good afternoon' },
    evening: { native: 'Ina wuni', english: 'Good evening' },
  },
  zulu: {
    morning: { native: 'Sawubona', english: 'Good morning' },
    afternoon: { native: 'Sawubona', english: 'Good afternoon' },
    evening: { native: 'Sawubona', english: 'Good evening' },
  },
  amharic: {
    morning: { native: 'ጤና ይስጥልኝ', english: 'Good morning' },
    afternoon: { native: 'ጤና ይስጥልኝ', english: 'Good afternoon' },
    evening: { native: 'ጤና ይስጥልኝ', english: 'Good evening' },
  },
  igbo: {
    morning: { native: 'Ụtụtụ ọma', english: 'Good morning' },
    afternoon: { native: 'Ehihie ọma', english: 'Good afternoon' },
    evening: { native: 'Mgbede ọma', english: 'Good evening' },
  },
  xhosa: {
    morning: { native: 'Molo', english: 'Good morning' },
    afternoon: { native: 'Molo', english: 'Good afternoon' },
    evening: { native: 'Molo', english: 'Good evening' },
  },
  akan: {
    morning: { native: 'Maakye', english: 'Good morning' },
    afternoon: { native: 'Maaha', english: 'Good afternoon' },
    evening: { native: 'Maadwo', english: 'Good evening' },
  },
};

export function getGreetingForLanguage(languageId) {
  const lang = (languageId || 'yoruba').toLowerCase();
  const greetings = GREETINGS_BY_LANGUAGE[lang] || GREETINGS_BY_LANGUAGE.yoruba;
  const hour = new Date().getHours();
  const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  return greetings[period] || greetings.morning;
}

/**
 * Fun facts about African languages / culture (short, for Home display).
 */
export const FUN_FACTS = [
  'Yoruba has three tones: high, mid, and low—the same word can mean different things!',
  'Swahili is spoken by over 200 million people across East Africa.',
  'In many African cultures, greetings can include asking about family before business.',
  'Hausa is one of the most widely spoken African languages, with millions of speakers.',
  'Proverbs are central to communication in many African languages.',
  'The Zulu click sounds (like in "Sawubona") are among the rarest in the world.',
  'Amharic uses its own script, Ge\'ez, one of the oldest alphabets still in use.',
  'Learning greetings well opens doors—they\'re the first step in any conversation.',
];

export function getRandomFunFact() {
  return FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
}
