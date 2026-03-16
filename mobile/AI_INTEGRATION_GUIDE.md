# AI Features Integration Guide

## Current Status
The ConversationScreen is currently using mock data and console.logs. We need to integrate real backend APIs.

## What Needs to Be Integrated

### 1. Initialize Conversation (on screen load)
- Call `conversationAPI.startConversation(language.id, personality.id)`
- Store `conversationId` in state
- Get initial AI greeting message

### 2. Audio Recording (Push-to-Talk)
- Start recording when PTT button pressed
- Stop recording when released
- Save audio file using expo-av

### 3. Audio Transcription
- Send recorded audio to `audioAPI.transcribe()`
- Uses Whisper API on backend
- Get transcribed text

### 4. Send Message to AI
- Call `conversationAPI.sendMessage(conversationId, transcribedText)`
- Backend processes with Claude/GPT
- Get AI response with audio URL

### 5. Play AI Audio
- Use `expo-av` to play AI response audio
- Show transcript while playing

### 6. Cultural Tips
- Call `tipsAPI.getRandomTips(language.id)` on load
- Rotate through real tips from backend

### 7. Vocabulary Updates
- Get vocabulary count from `vocabularyAPI.getStats(language.id)`
- Update count when new words learned

### 8. Help Me Respond
- Call `conversationAPI.getSuggestions(conversationId)`
- Show real AI-generated suggestions

## Required Changes to ConversationScreen.js

1. Add state for:
   - `conversationId` (string)
   - `recording` (Audio.Recording object)
   - `sound` (Audio.Sound for AI audio)
   - `culturalTips` (array from API)
   - `loading` (boolean)

2. Add useEffect to initialize conversation on mount

3. Replace handlePTTPress with real audio recording

4. Replace handlePTTRelease with:
   - Stop recording
   - Transcribe audio
   - Send message to backend
   - Get AI response
   - Play AI audio

5. Replace cultural tips loading with API call

6. Update vocabulary count from API

7. Update Help Me Respond to use real API

## API Base URL Configuration

Make sure your API base URL is correct in `src/services/api.js`:
- For physical device: Use your computer's IP address
- For emulator: Use `http://10.0.2.2:5000/api` (Android) or `http://localhost:5000/api` (iOS)
- For testing: You may need to update the CORS_ORIGIN in server/.env

