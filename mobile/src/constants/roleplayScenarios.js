/**
 * Sub-scenarios for categories with hasScenarios: true.
 * Each `id` must exist in server CONVERSATION_TYPES.
 */
export const MAKING_FRIENDS_SCENARIOS = [
  {
    id: 'making_friends',
    label: 'Default (AI choice)',
    subtitle: 'The AI picks a natural way to start making friends and small talk',
    icon: 'sparkles',
  },
  {
    id: 'making_friends_park',
    label: 'You meet someone at a park',
    subtitle: 'A relaxed outdoor chat on a bench or a walk',
    icon: 'sunny',
  },
  {
    id: 'making_friends_class',
    label: 'Talk to a classmate about class',
    subtitle: 'Ask what the class and professor are like, or how they are doing',
    icon: 'school',
  },
  {
    id: 'making_friends_study',
    label: 'Introduce yourself at a study group or club',
    subtitle: 'New group: names, interests, and a friendly first impression',
    icon: 'people',
  },
];

const SCENARIO_INDEX = new Map(MAKING_FRIENDS_SCENARIOS.map((s) => [s.id, s]));

/**
 * Human-readable label for roleplay summary / headers (includes sub-scenarios).
 */
/**
 * @returns {string | null} Label if this id is a known sub-scenario; otherwise null to fall back to top-level category.
 */
export function getRoleplayDisplayLabel(conversationType) {
  if (!conversationType) return 'Roleplay';
  const sub = SCENARIO_INDEX.get(conversationType);
  if (sub) return sub.label;
  return null;
}
