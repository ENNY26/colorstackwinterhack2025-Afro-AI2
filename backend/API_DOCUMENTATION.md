# AfroLingo Backend API Documentation

## Base URL
```
http://localhost:8080/api/v1
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Endpoints

### Authentication

#### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "first_name": "John",
    "last_name": "Doe"
  },
  "tokens": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 900
  }
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** Same as register

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "refresh_token"
}
```

**Response:**
```json
{
  "tokens": {
    "access_token": "new_jwt_token",
    "refresh_token": "new_refresh_token",
    "expires_in": 900
  }
}
```

#### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refresh_token": "refresh_token"
}
```

### Conversations

#### Create Conversation
```http
POST /api/v1/conversations
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "language": "Swahili",
  "language_code": "swahili",
  "conversation_type": "casual"
}
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "language": "Swahili",
  "language_code": "swahili",
  "conversation_type": "casual",
  "title": "New Conversation",
  "message_count": 0,
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Get Conversations
```http
GET /api/v1/conversations?limit=20&offset=0
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "conversations": [...],
  "total": 10,
  "limit": 20,
  "offset": 0
}
```

#### Get Conversation
```http
GET /api/v1/conversations/:id
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "language": "Swahili",
  "messages": [...]
}
```

#### Send Message
```http
POST /api/v1/conversations/:id/messages
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "content": "Jambo! Habari yako?",
  "audio_url": "optional",
  "transcription": "optional"
}
```

**Response:**
```json
{
  "user_message": {
    "id": "uuid",
    "role": "user",
    "content": "Jambo! Habari yako?",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "ai_message": {
    "id": "uuid",
    "role": "assistant",
    "content": "Mzuri sana! Habari yako?",
    "created_at": "2024-01-01T00:00:01Z"
  }
}
```

#### Get Conversation Summary
```http
GET /api/v1/conversations/:id/summary
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "summary": "This conversation covered basic greetings in Swahili..."
}
```

#### Get Recommended Responses
```http
GET /api/v1/conversations/:id/recommended
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "recommended_responses": [
    "Habari za asubuhi?",
    "Umeamkaje?",
    "Mambo vipi?"
  ]
}
```

### Audio

#### Upload Audio
```http
POST /api/v1/audio/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

audio: <file>
conversation_id: uuid
language: swahili
```

**Response:**
```json
{
  "audio_url": "https://s3.amazonaws.com/...",
  "transcription": "Transcribed text"
}
```

#### Text to Speech
```http
POST /api/v1/audio/tts
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "text": "Jambo! Habari yako?",
  "voice": "alloy",
  "language": "swahili"
}
```

**Response:**
```json
{
  "audio_url": "https://s3.amazonaws.com/..."
}
```

### WebSocket

#### Connect
```http
GET /ws
Upgrade: websocket
```

WebSocket connection for real-time message exchange.

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

## Conversation Types

- `casual` - Casual everyday conversation
- `learning` - Language learning and practice
- `cultural` - Cultural exchange and traditions
- `business` - Professional business communication
- `storytelling` - Storytelling and folktales

## Supported Languages

- `swahili` - Swahili (Kiswahili)
- `yoruba` - Yoruba (Èdè Yorùbá)
- `igbo` - Igbo (Asụsụ Igbo)
- `hausa` - Hausa (Harshen Hausa)
- `zulu` - Zulu (isiZulu)
- `xhosa` - Xhosa (isiXhosa)
- `amharic` - Amharic (አማርኛ)
- `wolof` - Wolof
- `afrikaans` - Afrikaans
- `fula` - Fula (Fulfulde)

