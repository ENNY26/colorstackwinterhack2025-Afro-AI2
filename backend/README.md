# AfroLingo Backend

Golang backend for the AfroLingo mobile application.

## Tech Stack

- **Framework**: Fiber (Fast HTTP framework)
- **Database**: PostgreSQL with GORM
- **Authentication**: JWT (Access + Refresh tokens), bcrypt
- **AI/ML**: OpenAI API (Chat, STT, TTS), Whisper API
- **Storage**: AWS S3 (audio files)
- **Real-time**: WebSockets (Fiber WebSocket)

## Project Structure

```
backend/
├── cmd/
│   └── server/          # Main application entry point
├── internal/
│   ├── handlers/        # HTTP handlers
│   ├── services/        # Business logic
│   ├── models/          # Database models
│   ├── middleware/      # HTTP middleware (auth, etc.)
│   ├── database/        # Database connection and migrations
│   ├── ai/              # AI integration (OpenAI, Whisper)
│   └── storage/         # S3 storage client
├── pkg/
│   ├── jwt/             # JWT utilities
│   ├── websocket/       # WebSocket hub and client
│   └── utils/           # Shared utilities
├── migrations/          # Database migration files
└── go.mod
```

## Setup

### Prerequisites

- Go 1.21 or higher
- PostgreSQL database
- AWS account (for S3)
- OpenAI API key

### Installation

1. Install dependencies:
```bash
go mod download
```

2. Copy `.env.example` to `.env` and fill in your configuration:
```bash
cp .env.example .env
```

3. Update `.env` with your credentials:
   - Database connection details
   - JWT secret
   - OpenAI API key
   - AWS credentials
   - S3 bucket name

4. Run the server:
```bash
go run cmd/server/main.go
```

Or build and run:
```bash
go build -o bin/server cmd/server/main.go
./bin/server
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user

### Conversations

- `POST /api/v1/conversations` - Create new conversation
- `GET /api/v1/conversations` - Get user's conversations
- `GET /api/v1/conversations/:id` - Get conversation details
- `POST /api/v1/conversations/:id/messages` - Send message
- `GET /api/v1/conversations/:id/summary` - Get conversation summary
- `GET /api/v1/conversations/:id/recommended` - Get recommended responses

### WebSocket

- `GET /ws` - WebSocket connection for real-time communication

## Features

### Authentication
- JWT-based authentication with access and refresh tokens
- Password hashing with bcrypt
- Token refresh mechanism
- Optional Firebase Auth support (to be implemented)

### AI Integration
- OpenAI GPT-4 for conversations
- Whisper API for speech-to-text (African accent support)
- OpenAI TTS for text-to-speech
- Custom prompt engineering for African languages
- Conversation context management

### Storage
- AWS S3 for audio file storage
- Presigned URLs for secure access
- Automatic file organization by date

### Real-time Communication
- WebSocket support for live conversations
- Message broadcasting
- Client connection management

## Environment Variables

See `.env.example` for all required environment variables.

## Database

The application uses PostgreSQL with GORM for ORM. Models are auto-migrated on startup.

### Models

- **User**: User accounts
- **RefreshToken**: Refresh token storage
- **Conversation**: User conversations
- **Message**: Conversation messages
- **RecommendedResponse**: AI-generated response suggestions
- **Proverb**: Daily proverbs

## Development

### Running in Development

```bash
go run cmd/server/main.go
```

### Building for Production

```bash
go build -o bin/server cmd/server/main.go
```

### Database Migrations

Migrations run automatically on startup. For manual migrations, use GORM's migration tools.

## Next Steps

- [ ] Implement Firebase Auth for social login
- [ ] Add ElevenLabs/Meta TTS integration
- [ ] Implement proverb management endpoints
- [ ] Add audio upload endpoints
- [ ] Enhance WebSocket message handling
- [ ] Add rate limiting
- [ ] Add request validation
- [ ] Add comprehensive error handling
- [ ] Add logging and monitoring
- [ ] Add unit and integration tests

## License

MIT
