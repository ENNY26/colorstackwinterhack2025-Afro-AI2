# Afro AI - Quick Start Guide

## Current Status ✅

Based on the API check, you have:
- ✅ **Anthropic API Key** - Configured (for AI conversations)
- ✅ **ElevenLabs API Key** - Configured (for Text-to-Speech)
- ✅ **ElevenLabs Voice ID** - Configured
- ✅ **MongoDB URI** - Configured
- ✅ **JWT Secret** - Configured
- ❌ **OpenAI API Key** - **MISSING** (REQUIRED for Speech-to-Text)

## The Problem 🔴

You're seeing "Network Error" because:
1. **Backend server is not running** - The mobile app can't connect
2. **Missing OpenAI API Key** - Even if backend runs, Whisper (STT) won't work

## Solution: 3 Steps to Get Everything Working 🚀

### Step 1: Add OpenAI API Key

**Why?** OpenAI Whisper is required to transcribe user's speech (Speech-to-Text).

1. Get your OpenAI API key:
   - Go to https://platform.openai.com/api-keys
   - Sign up/Login
   - Create new API key
   - Copy the key (starts with `sk-`)

2. Add to `server/.env`:
   ```env
   OPENAI_API_KEY=sk-your-openai-api-key-here
   ```

### Step 2: Start the Backend Server

**Windows:**
```bash
cd server
start-backend.bat
```

**Mac/Linux:**
```bash
cd server
chmod +x start-backend.sh
./start-backend.sh
```

**Or manually:**
```bash
cd server
npm run dev
```

You should see:
```
🚀 Afro AI Server running on port 5000
📊 Environment: development
🔗 Health check: http://localhost:5000/health
```

### Step 3: Start the Mobile App

**In a new terminal:**
```bash
cd mobile
npx expo start
```

Scan the QR code with Expo Go app, or press:
- `i` for iOS Simulator
- `a` for Android Emulator
- `w` for Web

## Complete API Flow (When Everything Works) 🔄

When you press and hold the PTT button:

```
1. 📱 User Records Audio
   ↓
2. 🔄 POST /api/audio/transcribe
   API: OpenAI Whisper
   Converts speech → text
   ↓
3. 💬 POST /api/conversations/:id/message
   API: Anthropic Claude
   Generates AI response in target language
   ↓
4. 🔊 POST /api/audio/synthesize
   API: ElevenLabs TTS
   Converts AI response text → audio
   ↓
5. 📱 Mobile App Plays Audio
   User hears AI speaking
   ↓
6. 💾 MongoDB
   Saves vocabulary words automatically
```

## Testing if Everything Works ✅

1. **Check backend is running:**
   ```bash
   curl http://localhost:5000/health
   ```
   Should return: `{"success":true,"message":"Afro AI Server is running"}`

2. **Check all API keys:**
   ```bash
   cd server
   npm run check-apis
   ```
   All should show ✅

3. **Test in mobile app:**
   - Open ConversationScreen
   - Press and hold PTT button
   - Speak something
   - Release button
   - You should hear AI response!

## Troubleshooting 🔧

### "Network Error" in Mobile App

**Problem:** Backend not running

**Solution:**
```bash
cd server
npm run dev
```

Make sure you see: `🚀 Afro AI Server running on port 5000`

### "Authentication Required"

**Problem:** Need to login/register first

**Solution:** The app should handle registration automatically, but if not:
```bash
# Register a user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### Audio Not Playing on Physical Device

**Problem:** `localhost` doesn't work on physical devices

**Solution:** Update `mobile/src/services/api.js`:
```javascript
const API_BASE = __DEV__ 
  ? 'http://192.168.1.XXX:5000'  // Replace XXX with your computer's IP
  : 'https://your-production-url.com';
```

Find your IP:
- **Windows:** `ipconfig` (look for IPv4 Address)
- **Mac/Linux:** `ifconfig` or `ip addr`

### "Transcription failed" Error

**Problem:** Missing or invalid OpenAI API key

**Solution:**
1. Check `server/.env` has `OPENAI_API_KEY=sk-...`
2. Verify key is valid at https://platform.openai.com/api-keys
3. Restart backend server after adding key

### APIs Not Being Called

**Problem:** Backend server not running or unreachable

**Solution:**
1. Start backend: `cd server && npm run dev`
2. Check it's running: `curl http://localhost:5000/health`
3. Check mobile app can reach it (update API_BASE if needed)
4. Check console logs for network errors

## What Each API Does 🎯

| API | Purpose | When Called | Required For |
|-----|---------|-------------|--------------|
| **OpenAI Whisper** | Speech-to-Text | User releases PTT | Transcribing audio |
| **Anthropic Claude** | AI Language Tutor | After transcription | Generating responses |
| **ElevenLabs TTS** | Text-to-Speech | After AI response | Speaking responses |
| **MongoDB** | Data Storage | Auto-save | Vocabulary tracking |

## Next Steps 📝

1. ✅ Add OpenAI API key to `server/.env`
2. ✅ Start backend: `cd server && npm run dev`
3. ✅ Start mobile: `cd mobile && npx expo start`
4. ✅ Test conversation flow
5. ✅ Check console logs to see API calls

## Need Help? 🆘

- See `server/SETUP_GUIDE.md` for detailed API setup
- Check `server/README.md` for API documentation
- Check console logs for specific error messages

---

**All APIs must be configured and backend must be running for full functionality!**
