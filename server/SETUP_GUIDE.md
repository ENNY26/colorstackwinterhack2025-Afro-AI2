# Afro AI Backend Setup Guide

This guide will help you set up all APIs for the language learning app.

## Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure API Keys

Copy the example environment file and fill in your API keys:

```bash
cp env.example.txt .env
```

Edit `server/.env` and add your API keys:

```env
# REQUIRED APIs for Full Functionality:

# 1. OpenAI API (REQUIRED for Speech-to-Text)
# Get your key at: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key-here

# 2. Anthropic Claude API (REQUIRED for AI Tutor)
# Get your key at: https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here

# 3. ElevenLabs API (REQUIRED for Text-to-Speech)
# Get your key at: https://elevenlabs.io/app/settings/api-keys
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
ELEVENLABS_VOICE_ID=your-preferred-voice-id

# 4. MongoDB (REQUIRED for Data Storage)
# Local: mongodb://localhost:27017/afro_ai
# Atlas: mongodb+srv://username:password@cluster.mongodb.net/afro_ai
MONGODB_URI=mongodb://localhost:27017/afro_ai

# 5. JWT Secret (for authentication)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# 6. AI Provider Selection
AI_PROVIDER=anthropic  # Use 'anthropic' or 'openai'
```

### 3. Start MongoDB

**Option A: MongoDB Atlas (Cloud)**
- Already configured if using Atlas URI
- No local installation needed

**Option B: Local MongoDB**
```bash
# Windows (using Chocolatey)
choco install mongodb

# macOS (using Homebrew)
brew tap mongodb/brew
brew install mongodb-community

# Linux
sudo apt-get install mongodb
sudo systemctl start mongod
```

### 4. Start the Backend Server

```bash
npm run dev
```

You should see:
```
🚀 Afro AI Server running on port 5000
📊 Environment: development
🔗 Health check: http://localhost:5000/health
```

### 5. Verify All APIs Are Working

Test the health endpoint:
```bash
curl http://localhost:5000/health
```

## API Flow in the App

When a user records audio, the app calls these APIs in sequence:

### 1. **Transcription API** (Whisper - OpenAI)
- **Route**: `POST /api/audio/transcribe`
- **Purpose**: Convert speech to text
- **API Used**: OpenAI Whisper
- **Required Key**: `OPENAI_API_KEY`

### 2. **Conversation API** (Creates/Updates Conversation)
- **Route**: `POST /api/conversations` (if new)
- **Route**: `POST /api/conversations/:id/message` (to send message)
- **Purpose**: Start new conversation or send message
- **API Used**: Anthropic Claude OR OpenAI GPT-4
- **Required Key**: `ANTHROPIC_API_KEY` OR `OPENAI_API_KEY`
- **Config**: `AI_PROVIDER=anthropic` or `AI_PROVIDER=openai`

### 3. **AI Response** (Language Tutor)
- **Service**: `aiTutorService.generateResponse()`
- **Purpose**: Generate AI response in target language
- **API Used**: Anthropic Claude (recommended) OR OpenAI GPT-4
- **Returns**: Response text + vocabulary words

### 4. **Text-to-Speech API** (ElevenLabs)
- **Route**: `POST /api/audio/synthesize`
- **Purpose**: Convert AI response text to speech
- **API Used**: ElevenLabs TTS
- **Required Key**: `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID`
- **Returns**: Audio file URL

### 5. **Vocabulary Tracking** (MongoDB)
- **Service**: Automatically saves new vocabulary words
- **Purpose**: Track learned words for user
- **Database**: MongoDB

## Troubleshooting

### "Network Error" in Mobile App

**Problem**: Backend server isn't running

**Solution**:
1. Make sure backend is running: `cd server && npm run dev`
2. Check if server is on port 5000: `http://localhost:5000/health`
3. Update API URL in mobile app if needed:
   - Edit `mobile/src/services/api.js`
   - Change `localhost` to your computer's IP for physical devices
   - For Android emulator: Use `10.0.2.2:5000`
   - For iOS simulator: Use `localhost:5000`

### "Authentication Required" Error

**Problem**: No authentication token

**Solution**: 
1. Register a user first: `POST /api/auth/register`
2. Login: `POST /api/auth/login`
3. Use the token in subsequent requests

**OR** for testing only, you can temporarily disable auth (see below).

### API Key Errors

**Problem**: Missing or invalid API keys

**Solution**:
1. Check `.env` file has all required keys
2. Verify keys are valid (no extra spaces)
3. Restart server after changing `.env`

### MongoDB Connection Error

**Problem**: Can't connect to MongoDB

**Solution**:
1. Make sure MongoDB is running: `mongod --version`
2. Check connection string in `.env`
3. For Atlas: Make sure IP is whitelisted
4. Test connection: `mongosh "your-connection-string"`

## Testing Without Authentication (Development Only)

For quick testing, you can temporarily disable auth middleware:

**In `server/src/routes/conversations.js`**, change:
```javascript
router.post('/', auth, [
```

To:
```javascript
router.post('/', async (req, res, next) => {
  // Create a mock user for testing
  req.user = { 
    _id: new mongoose.Types.ObjectId(),
    selectedLanguage: 'yoruba',
    aiPersonality: 'friendly',
    voiceSpeed: 'normal'
  };
  next();
}, [
```

**⚠️ WARNING**: Only do this for development! Never disable auth in production.

## All APIs Required for Full Functionality

| API | Purpose | Required For | Key Location |
|-----|---------|--------------|--------------|
| **OpenAI Whisper** | Speech-to-Text | Transcribing user audio | `.env`: `OPENAI_API_KEY` |
| **Anthropic Claude** | AI Language Tutor | Conversational AI responses | `.env`: `ANTHROPIC_API_KEY` |
| **ElevenLabs TTS** | Text-to-Speech | AI voice responses | `.env`: `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` |
| **MongoDB** | Data Storage | User data, conversations, vocabulary | `.env`: `MONGODB_URI` |
| **JWT** | Authentication | User sessions | `.env`: `JWT_SECRET` |

## Getting API Keys

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Sign up/Login
3. Create new API key
4. Copy to `.env` as `OPENAI_API_KEY`

### Anthropic Claude API Key
1. Go to https://console.anthropic.com/settings/keys
2. Sign up/Login (requires credits)
3. Create new API key
4. Copy to `.env` as `ANTHROPIC_API_KEY`
5. Set `AI_PROVIDER=anthropic` in `.env`

### ElevenLabs API Key
1. Go to https://elevenlabs.io/app/settings/api-keys
2. Sign up/Login
3. Create new API key
4. Copy to `.env` as `ELEVENLABS_API_KEY`
5. Get Voice ID from https://elevenlabs.io/app/voices
6. Copy voice ID to `.env` as `ELEVENLABS_VOICE_ID`

### MongoDB
- **Local**: Install MongoDB locally
- **Atlas** (Recommended): 
  1. Go to https://www.mongodb.com/cloud/atlas
  2. Create free cluster
  3. Get connection string
  4. Copy to `.env` as `MONGODB_URI`

## Next Steps

1. ✅ Fill in all API keys in `.env`
2. ✅ Start MongoDB
3. ✅ Run `npm run dev` to start backend
4. ✅ Test health endpoint: `curl http://localhost:5000/health`
5. ✅ Update mobile app API URL if needed
6. ✅ Start mobile app and test recording

## Complete Conversation Flow

```
User presses PTT → Records Audio
    ↓
[API 1] POST /api/audio/transcribe
    ↓ OpenAI Whisper
    ↓
Transcribed Text: "Báwo ni?"
    ↓
[API 2] POST /api/conversations/:id/message
    ↓ Anthropic Claude / OpenAI GPT
    ↓
AI Response: "Mo wà dáadáa, ẹ ṣé!"
    ↓
[API 3] POST /api/audio/synthesize
    ↓ ElevenLabs TTS
    ↓
Audio File URL: "/uploads/audio/xxx.mp3"
    ↓
Mobile App Plays Audio
    ↓
[Auto] Save Vocabulary to MongoDB
```

All APIs must be configured and working for the complete flow!

