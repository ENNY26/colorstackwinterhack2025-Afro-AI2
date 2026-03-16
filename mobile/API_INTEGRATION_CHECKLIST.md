# AI Features Integration Checklist

## ✅ Completed
- ✅ Added backend API service client (`src/services/api.js`)
- ✅ Updated ConversationScreen with:
  - Conversation initialization on mount
  - Audio recording with expo-av
  - Audio transcription with Whisper API
  - AI response generation (Claude/GPT)
  - Audio playback for AI responses
  - Cultural tips loading from backend
  - Vocabulary stats from backend
  - Help Me Respond with real suggestions

## ⚠️ Required Setup Before Testing

### 1. Backend Server Must Be Running
```bash
cd server
npm run dev
# Should see: 🚀 Afro AI Server running on port 5000
```

### 2. Authentication Required
**IMPORTANT:** The backend APIs require JWT authentication. You need to:

**Option A: Add Authentication Screens**
- Create Login/Register screens
- Store JWT token after login
- Token is automatically included in API calls via axios interceptors

**Option B: Quick Test (Bypass Auth for Development)**
- Temporarily remove `auth` middleware from routes for testing
- Or create a test user and hardcode the token

**Option C: Use Mock Mode (Current)**
- The app will fall back to mock data if APIs fail
- Good for UI testing, but no real AI features

### 3. API Base URL Configuration

**For Physical Devices:**
Update `mobile/src/services/api.js`:
```javascript
const API_BASE_URL = __DEV__ 
  ? 'http://YOUR_COMPUTER_IP:5000/api'  // Replace with your IP
  : 'https://your-production-url.com/api';
```

**To find your computer's IP:**
- Windows: `ipconfig` → Look for IPv4 Address
- macOS/Linux: `ifconfig` → Look for inet address

**For Emulators:**
- Android: `http://10.0.2.2:5000/api` (works automatically)
- iOS Simulator: `http://localhost:5000/api` (works automatically)

### 4. CORS Configuration
Make sure `server/.env` has:
```env
CORS_ORIGIN=http://localhost:8081
# For physical devices, you may need to add your device's IP or use *
CORS_ORIGIN=*
```

## 🔧 Testing Steps

1. **Start Backend:**
   ```bash
   cd server
   npm run dev
   ```

2. **Verify Backend Health:**
   ```bash
   curl http://localhost:5000/health
   ```
   Should return: `{"success":true,"message":"Afro AI Server is running"}`

3. **Test Authentication (if implemented):**
   - Register a test user
   - Login and verify token is stored

4. **Start Mobile App:**
   ```bash
   cd mobile
   npx expo start
   ```

5. **Test Features:**
   - Navigate to Conversation screen
   - Press Push-to-Talk button
   - Speak something
   - Release button
   - Should see: Recording → Processing → AI Response → Audio Playback

## 🐛 Common Issues

### "Network Error" or "Connection Refused"
- Backend not running → Start server
- Wrong API URL → Check IP address
- CORS error → Update CORS_ORIGIN in server/.env

### "401 Unauthorized"
- Not authenticated → Need to login first
- Token expired → Re-login

### "Failed to transcribe audio"
- OpenAI API key missing → Add to server/.env
- Audio format not supported → Check expo-av recording format

### "Failed to get AI response"
- Anthropic/OpenAI API key missing → Add to server/.env
- AI_PROVIDER not set → Set to 'anthropic' or 'openai' in .env

### Audio not playing
- ElevenLabs API key missing → Add to server/.env
- Audio URL format incorrect → Check backend audio path

## 📝 Next Steps

1. **Add Authentication Screens** (Login/Register)
2. **Update API Base URL** for your network
3. **Test on Physical Device** with correct IP
4. **Handle Offline Mode** gracefully
5. **Add Error Handling UI** for better UX

## 🚀 Quick Test Without Auth

To test immediately without authentication, you can temporarily comment out auth middleware in:
- `server/src/routes/conversations.js`
- `server/src/routes/audio.js`
- `server/src/routes/vocabulary.js`

Or create a simple test token generator script.

