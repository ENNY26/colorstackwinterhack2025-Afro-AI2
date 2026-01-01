import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL for the API
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000/api' 
  : 'https://your-production-url.com/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  (response) => response,
  async (error) => {
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
  startConversation: async (language, personality) => {
    const response = await api.post('/conversations', { language, personality });
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
    formData.append('audio', {
      uri: audioFile.uri,
      type: audioFile.type || 'audio/webm',
      name: audioFile.name || 'recording.webm',
    });
    if (language) {
      formData.append('language', language);
    }

    const response = await api.post('/audio/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  synthesize: async (text, speed, voiceId) => {
    const response = await api.post('/audio/synthesize', { text, speed, voiceId });
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

