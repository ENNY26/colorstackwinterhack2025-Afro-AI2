// API Configuration
// Update these based on your environment

// For development
// Android Emulator: http://10.0.2.2:8080
// iOS Simulator: http://localhost:8080
// Physical Device: http://YOUR_COMPUTER_IP:8080

export const API_BASE_URL = __DEV__
  ? 'http://localhost:8080/api/v1'
  : 'https://api.afrolingo.com/api/v1';

export const WS_BASE_URL = __DEV__
  ? 'ws://localhost:8080'
  : 'wss://api.afrolingo.com';

// API Endpoints
export const ENDPOINTS = {
  // Auth
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  REFRESH_TOKEN: '/auth/refresh',
  LOGOUT: '/auth/logout',
  
  // Conversations
  CONVERSATIONS: '/conversations',
  CONVERSATION_BY_ID: (id) => `/conversations/${id}`,
  SEND_MESSAGE: (id) => `/conversations/${id}/messages`,
  CONVERSATION_SUMMARY: (id) => `/conversations/${id}/summary`,
  RECOMMENDED_RESPONSES: (id) => `/conversations/${id}/recommended`,
  
  // Audio
  UPLOAD_AUDIO: '/audio/upload',
  TEXT_TO_SPEECH: '/audio/tts',
  
  // WebSocket
  WEBSOCKET: '/ws',
};

// Helper function to build full URL
export const buildURL = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

