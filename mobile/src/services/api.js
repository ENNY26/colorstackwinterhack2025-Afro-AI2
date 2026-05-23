import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Base URL for the API (without /api)
// For physical devices, replace 'localhost' with your computer's IP address
// Example: 'http://192.168.1.100:5000'
// Android Emulator: http://10.0.2.2:5000 (default) or use your local IP
// iOS Simulator: http://localhost:5000
// Web: http://localhost:5000

// You can override the API URL by setting this environment variable
// For Android emulator issues, try using your local IP instead of 10.0.2.2
// Example: EXPO_PUBLIC_API_URL=http://192.168.1.100:5000
const getApiBase = () => {
  if (!__DEV__) {
    return 'https://your-production-url.com';
  }

  // Web (browser): always use localhost so the same machine's server is reachable.
  // EXPO_PUBLIC_API_URL is for phone/device; in browser it often causes ERR_CONNECTION_TIMED_OUT.
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }

  // Explicit override for physical device / CI (not used on web or we'd use it above)
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Android emulator: 10.0.2.2 is the only reliable way to reach the host.
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  // iOS Simulator / Expo Go on phone: use debugger host IP so physical devices can connect
  try {
    const debuggerHost = Constants.manifest?.debuggerHost || Constants.expoConfig?.extra?.hostUri || Constants.manifest2?.debuggerHost;
    if (debuggerHost) {
      const host = debuggerHost.split(':')[0];
      return `http://${host}:5000`;
    }
  } catch (e) {
    // ignore
  }

  if (Platform.OS === 'ios') {
    return 'http://localhost:5000';
  }

  return 'http://localhost:5000';
};

const API_BASE = getApiBase();

/** Set EXPO_PUBLIC_API_DEBUG=1 to log every request (slow in dev). */
const API_DEBUG =
  typeof __DEV__ !== 'undefined' &&
  __DEV__ &&
  typeof process !== 'undefined' &&
  process.env?.EXPO_PUBLIC_API_DEBUG === '1';

if (API_DEBUG) {
  console.log(`[API] Using base URL: ${API_BASE} (Platform: ${Platform.OS})`);
}

export { API_BASE };

// API base URL (with /api)
const API_BASE_URL = `${API_BASE}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional per-request logging (disabled by default — slows the UI thread in dev)
if (API_DEBUG) {
  api.interceptors.request.use(
    (config) => {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      return config;
    },
    (error) => Promise.reject(error)
  );
}

// Token storage key
const TOKEN_KEY = 'afro_ai_token';
const USER_KEY = 'afro_ai_user';
/** Local-only flag: user chose "try the app" without signing in (still may get a server guest token via ensureAuthenticated). */
const GUEST_TRY_KEY = 'afro_ai_guest_try';

/** Avoid AsyncStorage read on every HTTP request (major RN perf win). */
let authTokenKnown = false;
let authTokenMemory = null;

function setAuthTokenMemory(token) {
  authTokenMemory = token ?? null;
  authTokenKnown = true;
}

function clearAuthTokenMemory() {
  authTokenMemory = null;
  authTokenKnown = true;
}

async function getAuthTokenCached() {
  if (authTokenKnown) return authTokenMemory;
  authTokenMemory = await AsyncStorage.getItem(TOKEN_KEY);
  authTokenKnown = true;
  return authTokenMemory;
}

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await getAuthTokenCached();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    if (API_DEBUG) {
      console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error) => {
    if (__DEV__) {
      const url = error.config?.url || '';
      const status = error.response?.status;
      console.warn(`[API] ${error.config?.method?.toUpperCase()} ${url}`, status ?? error.code ?? error.message);
    }

    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      clearAuthTokenMemory();
    }

    return Promise.reject(error);
  }
);

// ============= AUTH API =============

/** Single in-flight guest registration so parallel ensureAuthenticated() calls do not stack requests. */
let ensureAuthInFlight = null;

export const authAPI = {
  register: async (data, axiosConfig = {}) => {
    const { timeout = 30000, ...rest } = axiosConfig;
    const response = await api.post('/auth/register', data, { timeout, ...rest });
    if (response.data.success) {
      await AsyncStorage.removeItem(GUEST_TRY_KEY);
      await AsyncStorage.setItem(TOKEN_KEY, response.data.data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.data.user));
      setAuthTokenMemory(response.data.data.token);
    }
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success) {
      await AsyncStorage.removeItem(GUEST_TRY_KEY);
      await AsyncStorage.setItem(TOKEN_KEY, response.data.data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.data.user));
      setAuthTokenMemory(response.data.data.token);
    }
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Offline / CORS / missing route — still clear local session
    } finally {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, GUEST_TRY_KEY]);
      clearAuthTokenMemory();
    }
  },

  /** Mark session as "try without signing in" so the app opens main flow without email/password. */
  setGuestTrySession: async () => {
    await AsyncStorage.setItem(GUEST_TRY_KEY, '1');
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  getStoredUser: async () => {
    const user = await AsyncStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: async () => {
    const [token, guestTry] = await Promise.all([
      getAuthTokenCached(),
      AsyncStorage.getItem(GUEST_TRY_KEY),
    ]);
    return !!token || guestTry === '1';
  },

  // Auto-register guest user for testing/development
  ensureAuthenticated: async () => {
    if (ensureAuthInFlight) {
      return ensureAuthInFlight;
    }

    ensureAuthInFlight = (async () => {
      try {
        const token = await getAuthTokenCached();
        if (token) {
          try {
            await api.get('/auth/me', { timeout: 8000 });
            return true;
          } catch (err) {
            await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
            clearAuthTokenMemory();
          }
        }

        const guestEmail = `guest_${Date.now()}@afrolingo.app`;
        const guestPassword = 'guest_' + Math.random().toString(36).substring(2, 15);
        const guestName = 'Guest User';

        console.log('Auto-registering guest user for testing...');
        const result = await authAPI.register(
          {
            email: guestEmail,
            password: guestPassword,
            name: guestName,
          },
          { timeout: 15000 }
        );

        if (result.success) {
          console.log('Guest user registered successfully');
          return true;
        }
        console.warn('Failed to auto-register guest:', result.message);
        return false;
      } catch (err) {
        if (err.response?.status === 409) {
          console.warn('Guest registration conflict (409).');
          return false;
        }
        console.warn('Error ensuring authentication:', err?.message || err);
        return false;
      } finally {
        ensureAuthInFlight = null;
      }
    })();

    return ensureAuthInFlight;
  },
};

// ============= USER API =============

export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/users/profile', data);
    if (response.data.success) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/users/password', { currentPassword, newPassword });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/users/stats');
    return response.data;
  },

  deleteAccount: async () => {
    const response = await api.delete('/users/account');
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, GUEST_TRY_KEY]);
    clearAuthTokenMemory();
    return response.data;
  },
};

// ============= CONVERSATION API =============

export const conversationAPI = {
  startConversation: async (language, personality, conversationType) => {
    const body = { language, personality };
    if (conversationType) body.conversationType = conversationType;
    const response = await api.post('/conversations', body);
    return response.data;
  },

  sendMessage: async (conversationId, content) => {
    const response = await api.post(
      `/conversations/${conversationId}/message`,
      { content },
      { timeout: 120000 }
    );
    return response.data;
  },

  getSuggestions: async (conversationId) => {
    const response = await api.get(`/conversations/${conversationId}/suggestions`);
    return response.data;
  },

  getConversations: async (params = {}) => {
    const response = await api.get('/conversations', { params });
    return response.data;
  },

  getConversation: async (conversationId) => {
    const response = await api.get(`/conversations/${conversationId}`);
    return response.data;
  },

  endConversation: async (conversationId) => {
    const response = await api.put(`/conversations/${conversationId}/end`);
    return response.data;
  },

  deleteConversation: async (conversationId) => {
    const response = await api.delete(`/conversations/${conversationId}`);
    return response.data;
  },
};

// ============= VOCABULARY API =============

export const vocabularyAPI = {
  getVocabulary: async (params = {}) => {
    const response = await api.get('/vocabulary', { params });
    return response.data;
  },

  addWord: async (data) => {
    const response = await api.post('/vocabulary', data);
    return response.data;
  },

  updateWord: async (wordId, data) => {
    const response = await api.put(`/vocabulary/${wordId}`, data);
    return response.data;
  },

  toggleFavorite: async (wordId) => {
    const response = await api.put(`/vocabulary/${wordId}/favorite`);
    return response.data;
  },

  recordReview: async (wordId, correct) => {
    const response = await api.post(`/vocabulary/${wordId}/review`, { correct });
    return response.data;
  },

  getWordAudio: async (wordId) => {
    const response = await api.get(`/vocabulary/${wordId}/audio`);
    return response.data;
  },

  deleteWord: async (wordId) => {
    const response = await api.delete(`/vocabulary/${wordId}`);
    return response.data;
  },

  getStats: async (language) => {
    const response = await api.get('/vocabulary/stats', { params: { language } });
    return response.data;
  },

  getReviewWords: async (language, limit = 10) => {
    const response = await api.get('/vocabulary/review', { params: { language, limit } });
    return response.data;
  },
};

// ============= AUDIO API =============

export const audioAPI = {
  transcribe: async (audioFile, language) => {
    const formData = new FormData();
    
    // Handle React Native Web vs Native differently
    if (Platform.OS === 'web') {
      // On web, we need to fetch the file from URI and create a File object
      try {
        // Check if URI is a blob URL or data URL
        let blob;
        if (audioFile.uri.startsWith('blob:') || audioFile.uri.startsWith('data:')) {
          // It's already a blob or data URL - fetch it
          const response = await fetch(audioFile.uri);
          blob = await response.blob();
        } else if (audioFile.uri.startsWith('file://')) {
          // File URI - try to read as blob
          const response = await fetch(audioFile.uri);
          blob = await response.blob();
        } else {
          // Try fetching directly
          const response = await fetch(audioFile.uri);
          blob = await response.blob();
        }
        
        // Determine MIME type from blob or audioFile
        const mimeType = blob.type || audioFile.type || 'audio/webm'; // web typically uses webm
        
        const file = new File([blob], audioFile.name || 'recording.webm', {
          type: mimeType,
        });
        formData.append('audio', file);
      } catch (err) {
        console.error('Failed to process audio file for web upload:', err);
        console.error('Audio file URI:', audioFile.uri);
        console.error('Audio file type:', audioFile.type);
        throw new Error(`Failed to prepare audio file for upload: ${err.message}`);
      }
    } else {
      // Native React Native format
      formData.append('audio', {
        uri: audioFile.uri,
        type: audioFile.type || 'audio/m4a',
        name: audioFile.name || 'recording.m4a',
      });
    }
    
    if (language) {
      formData.append('language', language);
    }

    try {
      const response = await api.post('/audio/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 90000,
      });
      return response.data;
    } catch (error) {
      console.error('Transcription API error:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Tutor / roleplay: transcribe + pronunciation score (proxied to ai_speech_service).
   * @param {object} audioFile - { uri, type, name }
   * @param {string} expectedText - target phrase
   * @param {'tutor'|'roleplay'} [mode='tutor']
   */
  practiceRound: async (audioFile, expectedText, mode = 'tutor') => {
    if (!audioFile || audioFile.uri == null || audioFile.uri === '') {
      throw new Error('No recording file (missing URI). Finish recording and try again.');
    }

    const formData = new FormData();

    if (Platform.OS === 'web') {
      try {
        let blob;
        const u = audioFile.uri;
        if (u.startsWith('blob:') || u.startsWith('data:')) {
          const response = await fetch(u);
          blob = await response.blob();
        } else {
          const response = await fetch(u);
          blob = await response.blob();
        }
        const mimeType = blob.type || audioFile.type || 'audio/webm';
        const file = new File([blob], audioFile.name || 'recording.webm', { type: mimeType });
        formData.append('audio', file);
      } catch (err) {
        throw new Error(`Failed to prepare audio: ${err.message}`);
      }
    } else {
      formData.append('audio', {
        uri: audioFile.uri,
        type: audioFile.type || 'audio/m4a',
        name: audioFile.name || 'recording.m4a',
      });
    }

    formData.append('expected_text', expectedText);
    formData.append('mode', mode);

    try {
      const response = await api.post('/audio/practice-round', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('practice-round API error:', error.response?.data || error.message);
      throw error;
    }
  },

  synthesize: async (text, speed, voiceId, language) => {
    const response = await api.post('/audio/synthesize', { text, speed, voiceId, language });
    return response.data;
  },

  pronounce: async (word, language) => {
    const response = await api.post('/audio/pronounce', { word, language });
    return response.data;
  },

  getVoices: async () => {
    const response = await api.get('/audio/voices');
    return response.data;
  },

  getQuota: async () => {
    const response = await api.get('/audio/quota');
    return response.data;
  },
};

// ============= LANGUAGES API =============

export const languagesAPI = {
  getAll: async () => {
    const response = await api.get('/languages');
    return response.data;
  },

  getById: async (languageId) => {
    const response = await api.get(`/languages/${languageId}`);
    return response.data;
  },

  getPersonalities: async () => {
    const response = await api.get('/languages/config/personalities', { timeout: 15000 });
    return response.data;
  },

  getConversationTypes: async () => {
    const response = await api.get('/languages/config/conversation-types');
    return response.data;
  },
};

// ============= TIPS API =============

export const tipsAPI = {
  getTips: async (language, type, limit) => {
    const response = await api.get('/tips', { params: { language, type, limit } });
    return response.data;
  },

  getRandomTips: async (language, count = 5, exclude = []) => {
    const response = await api.get('/tips/random', { 
      params: { language, count, exclude: exclude.join(',') } 
    });
    return response.data;
  },

  getTip: async (tipId) => {
    const response = await api.get(`/tips/${tipId}`);
    return response.data;
  },
};

// Export the configured axios instance for custom requests
export default api;

