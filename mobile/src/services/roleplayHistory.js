import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'afro_ai_roleplay_session_history';
const MAX_SESSIONS = 50;
const MAX_MESSAGES_EACH = 20;

function serializeMessage(m) {
  if (!m || typeof m !== 'object') return null;
  return {
    _id: m._id,
    content: m.content,
    role: m.role,
  };
}

/**
 * @param {object} payload
 * @param {string} [payload.conversationId]
 * @param {object} payload.language
 * @param {string} payload.conversationType
 * @param {object} [payload.summary] — from endConversation: duration, sessionReview, etc.
 * @param {Array} [payload.userMessages]
 * @param {Array} [payload.aiMessages]
 * @returns {Promise<string|null>} new entry id, or null on failure
 */
export async function saveRoleplaySession(payload) {
  try {
    const list = await getRoleplaySessions();
    const userMessages = (payload.userMessages || [])
      .slice(0, MAX_MESSAGES_EACH)
      .map(serializeMessage)
      .filter(Boolean);
    const aiMessages = (payload.aiMessages || [])
      .slice(0, MAX_MESSAGES_EACH)
      .map(serializeMessage)
      .filter(Boolean);

    const entry = {
      id: `rp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      savedAt: Date.now(),
      conversationId: payload.conversationId || null,
      language: payload.language || {},
      conversationType: payload.conversationType || 'casual',
      summary: payload.summary || null,
      userMessages,
      aiMessages,
    };

    const next = [entry, ...list].slice(0, MAX_SESSIONS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return entry.id;
  } catch (e) {
    console.warn('saveRoleplaySession:', e);
    return null;
  }
}

/**
 * @returns {Promise<Array<object>>} Newest first; each has id, savedAt, language, conversationType, summary, messages…
 */
export async function getRoleplaySessions() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getRoleplaySessionById(id) {
  const list = await getRoleplaySessions();
  return list.find((s) => s.id === id) || null;
}
