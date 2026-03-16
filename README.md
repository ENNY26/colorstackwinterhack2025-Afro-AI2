# Afro AI 🌍

**AI-Powered African Language Learning App**

Learn African languages through natural voice conversations with an AI tutor. Built with the MERN stack and React Native/Expo.

## 🎯 Features

- 🗣️ **Voice Conversations** - Speak naturally with AI in 8+ African languages
- 🤖 **AI Tutor Personalities** - Choose from 5 different teaching styles
- 📚 **Vocabulary Tracking** - Build your word bank with spaced repetition
- 💡 **Cultural Tips** - Learn cultural context as you practice
- 📊 **Progress Tracking** - Streaks, statistics, and achievements

## 🌍 Supported Languages

| Flag | Language | Region | Speakers |
|------|----------|--------|----------|
| 🇳🇬 | Yoruba | Nigeria | 45M+ |
| 🇹🇿 | Swahili | East Africa | 100M+ |
| 🇳🇬 | Hausa | West Africa | 70M+ |
| 🇿🇦 | Zulu | South Africa | 12M+ |
| 🇪🇹 | Amharic | Ethiopia | 32M+ |
| 🇳🇬 | Igbo | Nigeria | 45M+ |
| 🇿🇦 | Xhosa | South Africa | 8M+ |
| 🇬🇭 | Akan | Ghana | 11M+ |

## 🛠️ Tech Stack

### Frontend (Mobile)
- **React Native** with **Expo**
- React Navigation (Stack + Bottom Tabs)
- Expo AV for audio
- Axios for API calls

### Backend (Server)
- **Node.js** with **Express**
- **MongoDB** with Mongoose
- JWT Authentication
- OpenAI Whisper (Speech-to-Text)
- OpenAI GPT-4 / Anthropic Claude (AI Tutor)
- ElevenLabs (Text-to-Speech)

## 📁 Project Structure

```
afro-ai/
├── mobile/                 # React Native + Expo app
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── screens/        # App screens
│   │   ├── navigation/     # Navigation setup
│   │   ├── services/       # API client
│   │   └── constants/      # Colors, mock data
│   ├── App.js
│   └── package.json
│
├── server/                 # Node.js + Express API
│   ├── src/
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── services/       # AI integrations
│   │   ├── middleware/     # Auth, error handling
│   │   └── config/         # DB, constants
│   ├── .env                # Environment variables
│   └── package.json
│
└── package.json            # Root workspace config
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Expo Go app (on your phone)

### 1. Clone and Install

```bash
git clone <your-repo>
cd afro-ai

# Install all dependencies
cd mobile && npm install
cd ../server && npm install
```

### 2. Configure Environment Variables

```bash
cd server
cp env.example.txt .env
# Edit .env with your API keys
```

Required keys:
- `MONGODB_URI` - MongoDB connection string
- `OPENAI_API_KEY` - From https://platform.openai.com
- `ELEVENLABS_API_KEY` - From https://elevenlabs.io
- `ELEVENLABS_VOICE_ID` - Voice ID from ElevenLabs
- `JWT_SECRET` - Any random string

### 3. Start the Backend

```bash
cd server
npm run dev
```

### 4. Start the Mobile App

```bash
cd mobile
npx expo start
```

Scan the QR code with Expo Go on your phone.

## 📱 App Screens

1. **Onboarding** - Welcome carousel explaining features
2. **Language Selection** - Choose from 8 African languages
3. **Personality Selection** - Pick your AI tutor style
4. **Conversation** - Voice-based chat with AI tutor
5. **Vocabulary** - Browse learned words
6. **Settings** - Preferences and account

## 🔑 API Keys Needed

| Service | Purpose | Get it from |
|---------|---------|-------------|
| OpenAI | Speech-to-text + AI | https://platform.openai.com |
| ElevenLabs | Text-to-speech | https://elevenlabs.io |
| MongoDB | Database | https://mongodb.com/atlas |

## 📖 API Documentation

See [server/README.md](./server/README.md) for full API documentation.

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines.

## 📄 License

MIT License - see LICENSE file for details.
