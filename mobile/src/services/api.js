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

// Log the API base URL in development for debugging
if (__DEV__) {
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

// Add request interceptor for debugging
if (__DEV__) {
  api.interceptors.request.use(
    (config) => {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
      console.log(`[API] Full URL: ${config.baseURL}${config.url}`);
      return config;
    },
    (error) => {
      console.error('[API] Request error:', error);
      return Promise.reject(error);
    }
  );
}

// Token storage key
const TOKEN_KEY = 'afro_ai_token';
const USER_KEY = 'afro_ai_user';

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
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
    if (__DEV__) {
      console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error) => {
    if (__DEV__) {
      console.error('[API] Error:', {
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        fullUrl: error.config ? `${error.config.baseURL}${error.config.url}` : 'N/A',
        status: error.response?.status,
        message: error.message,
        code: error.code,
        isNetworkError: !error.response,
      });
      // Also log server response body when available (validation error details)
      if (error.response?.data) {
        console.error('[API] Response body:', error.response.data);
      }
    }

    if (error.response?.status === 401) {
      // Token expired or invalid, clear storage
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      // You might want to redirect to login here
    }

    return Promise.reject(error);
  }
);

// ============= AUTH API =============

export const authAPI = {
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    if (response.data.success) {
      await AsyncStorage.setItem(TOKEN_KEY, response.data.data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success) {
      await AsyncStorage.setItem(TOKEN_KEY, response.data.data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    }
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
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return !!token;
  },

  // Auto-register guest user for testing/development
  ensureAuthenticated: async () => {
    try {
      // Check if already authenticated
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        // Verify token is still valid
        try {
          await api.get('/auth/me');
          return true;
        } catch (err) {
          // Token expired or invalid, clear it
          await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
        }
      }

      // Auto-register guest user
      const guestEmail = `guest_${Date.now()}@afrolingo.app`;
      const guestPassword = 'guest_' + Math.random().toString(36).substring(2, 15);
      const guestName = 'Guest User';

      console.log('Auto-registering guest user for testing...');
      const result = await authAPI.register({
        email: guestEmail,
        password: guestPassword,
        name: guestName,
      });

      if (result.success) {
        console.log('Guest user registered successfully');
        return true;
      } else {
        console.error('Failed to auto-register guest:', result.message);
        return false;
      }
    } catch (err) {
      console.error('Error ensuring authentication:', err);
      // If registration fails due to conflict or other issues, don't attempt
      // to guess credentials — return false so caller can handle it.
      if (err.response?.status === 409) {
        console.error('Guest registration conflict (409).');
        return false;
      }

      return false;
    }
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
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
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
    const response = await api.post(`/conversations/${conversationId}/message`, { content });
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
      });
      return response.data;
    } catch (error) {
      console.error('Transcription API error:', error.response?.data || error.message);
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
    const response = await api.get('/languages/config/personalities');
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

