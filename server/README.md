# Afro AI Backend Server

A Node.js/Express backend for the Afro AI language learning application. This server handles AI-powered conversations, audio processing, vocabulary tracking, and user management for learning African languages.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **AI Services**:
  - OpenAI Whisper (Speech-to-Text)
  - OpenAI GPT-4 / Anthropic Claude (Conversational AI)
  - ElevenLabs (Text-to-Speech)
- **File Upload**: Multer
- **Security**: Helmet, CORS, Rate Limiting

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── database.js      # MongoDB connection
│   │   └── constants.js     # Languages, personalities, etc.
│   ├── middleware/
│   │   ├── auth.js          # JWT authentication
│   │   ├── errorHandler.js  # Global error handling
│   │   └── upload.js        # Multer file upload config
│   ├── models/
│   │   ├── User.js          # User model
│   │   ├── Conversation.js  # Conversation model
│   │   ├── Vocabulary.js    # Vocabulary model
│   │   └── CulturalTip.js   # Cultural tips model
│   ├── routes/
│   │   ├── auth.js          # Authentication routes
│   │   ├── users.js         # User management routes
│   │   ├── conversations.js # Conversation routes
│   │   ├── vocabulary.js    # Vocabulary routes
│   │   ├── audio.js         # Audio processing routes
│   │   ├── languages.js     # Language config routes
│   │   └── tips.js          # Cultural tips routes
│   ├── services/
│   │   ├── whisperService.js    # OpenAI Whisper integration
│   │   ├── aiTutorService.js    # GPT/Claude integration
│   │   └── elevenLabsService.js # ElevenLabs TTS integration
│   ├── seeds/
│   │   └── seedData.js      # Database seeding script
│   └── index.js             # App entry point
├── uploads/                  # Audio file uploads
├── package.json
├── env.example.txt          # Environment variables template
└── README.md
```

## Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment Variables

Copy `env.example.txt` to `.env` and fill in your API keys:

```bash
cp env.example.txt .env
```

Required environment variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `OPENAI_API_KEY` - OpenAI API key (for Whisper & GPT)
- `ELEVENLABS_API_KEY` - ElevenLabs API key (for TTS)
- `ELEVENLABS_VOICE_ID` - Default voice ID for TTS

### 3. Start MongoDB

Make sure MongoDB is running locally or use MongoDB Atlas:

```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas URI in .env
```

### 4. Seed Database (Optional)

```bash
npm run seed
```

### 5. Start the Server

```bash
# Development
npm run dev

# Production
npm start
```

The server will start at `http://localhost:5000`

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout user |
| POST | `/api/auth/refresh` | Refresh JWT token |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get user profile |
| PUT | `/api/users/profile` | Update profile |
| PUT | `/api/users/password` | Change password |
| GET | `/api/users/stats` | Get learning statistics |
| DELETE | `/api/users/account` | Delete account |

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/conversations` | Start new conversation |
| GET | `/api/conversations` | List conversations |
| GET | `/api/conversations/:id` | Get conversation |
| POST | `/api/conversations/:id/message` | Send message |
| GET | `/api/conversations/:id/suggestions` | Get response suggestions |
| PUT | `/api/conversations/:id/end` | End conversation |
| DELETE | `/api/conversations/:id` | Delete conversation |

### Vocabulary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vocabulary` | Get vocabulary list |
| POST | `/api/vocabulary` | Add word |
| GET | `/api/vocabulary/stats` | Get vocabulary stats |
| GET | `/api/vocabulary/review` | Get words for review |
| PUT | `/api/vocabulary/:id` | Update word |
| PUT | `/api/vocabulary/:id/favorite` | Toggle favorite |
| POST | `/api/vocabulary/:id/review` | Record review result |
| GET | `/api/vocabulary/:id/audio` | Get pronunciation audio |
| DELETE | `/api/vocabulary/:id` | Delete word |

### Audio

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/audio/transcribe` | Transcribe audio (file) |
| POST | `/api/audio/transcribe-buffer` | Transcribe audio (buffer) |
| POST | `/api/audio/synthesize` | Text-to-speech |
| POST | `/api/audio/pronounce` | Pronounce word |
| GET | `/api/audio/voices` | Get available voices |
| GET | `/api/audio/quota` | Get TTS quota |

### Languages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/languages` | Get all languages |
| GET | `/api/languages/:id` | Get language details |
| GET | `/api/languages/config/personalities` | Get AI personalities |
| GET | `/api/languages/config/conversation-types` | Get conversation types |

### Cultural Tips

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tips` | Get tips by language |
| GET | `/api/tips/random` | Get random tips |
| GET | `/api/tips/:id` | Get specific tip |
| POST | `/api/tips` | Create tip (admin) |

## Supported Languages

- 🇳🇬 Yoruba
- 🇹🇿 Swahili
- 🇳🇬 Hausa
- 🇿🇦 Zulu
- 🇪🇹 Amharic
- 🇳🇬 Igbo
- 🇿🇦 Xhosa
- 🇬🇭 Akan

## AI Personalities

- 🎉 Quirky & Fun
- 📚 Serious & Professional
- 😊 Friendly & Casual
- 🌟 Patient & Encouraging
- 😄 Humorous

## Example API Usage

### Register User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe",
    "selectedLanguage": "yoruba"
  }'
```

### Start Conversation

```bash
curl -X POST http://localhost:5000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "language": "yoruba",
    "personality": "friendly"
  }'
```

### Send Message

```bash
curl -X POST http://localhost:5000/api/conversations/CONVERSATION_ID/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "content": "Bawo ni?"
  }'
```

### Transcribe Audio

```bash
curl -X POST http://localhost:5000/api/audio/transcribe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "audio=@recording.webm" \
  -F "language=yoruba"
```

## Error Handling

All API responses follow this format:

```json
{
  "success": true|false,
  "message": "Description",
  "data": { ... },
  "errors": [ ... ]
}
```

## Development

```bash
# Run with nodemon (hot reload)
npm run dev

# Run tests
npm test

# Seed database
npm run seed
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Set up MongoDB Atlas or managed MongoDB
4. Configure CORS for your frontend domain
5. Set up HTTPS with a reverse proxy (nginx)

```bash
# With PM2
pm2 start src/index.js --name afro-ai-server
```

## License

MIT

