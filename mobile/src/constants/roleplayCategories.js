/**
 * Roleplay scenario categories. IDs must match server CONVERSATION_TYPES.
 * hasScenarios: if true, Roleplay opens a sub-screen to pick a scene (e.g. Making friends).
 */
export const ROLEPLAY_CATEGORIES = [
  { id: 'greetings', label: 'Greetings & introductions', icon: 'hand-left' },
  {
    id: 'making_friends',
    label: 'Making friends',
    icon: 'people',
    hasScenarios: true,
    scenarioCategoryLabel: 'MAKING FRIENDS',
  },
  { id: 'food', label: 'Food & dining', icon: 'restaurant' },
  { id: 'travel', label: 'Travel', icon: 'airplane' },
  { id: 'shopping', label: 'Shopping', icon: 'cart' },
  { id: 'directions', label: 'Directions', icon: 'navigate' },
  { id: 'family', label: 'Family', icon: 'people' },
  { id: 'numbers', label: 'Numbers & counting', icon: 'calculator' },
  { id: 'emergency', label: 'Emergency & help', icon: 'medkit' },
  { id: 'culture', label: 'Culture & proverbs', icon: 'sparkles' },
  { id: 'casual', label: 'Casual chat', icon: 'chatbubbles' },
];

export function getRoleplayCategoryIcon(id) {
  const cat = ROLEPLAY_CATEGORIES.find((c) => c.id === id);
  return cat?.icon || 'chatbubbles';
}
