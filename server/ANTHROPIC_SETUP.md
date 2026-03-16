# Setting Up Anthropic Claude API

Since you're using Anthropic Claude for the AI tutor, here's how to configure it:

## 1. Get Your Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to **API Keys**
4. Click **Create Key**
5. Copy your API key (starts with `sk-ant-`)

## 2. Configure Your .env File

Edit `server/.env` and set:

```env
# Your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here

# Set provider to anthropic
AI_PROVIDER=anthropic
```

## 3. Important Notes

### You Still Need OpenAI!

Even though you're using Anthropic for the AI tutor, you **still need OpenAI** for:
- **Whisper** (Speech-to-Text) - to transcribe user audio
- OpenAI doesn't have a free tier, but Whisper is very cheap (~$0.006/minute)

### What Anthropic is Used For

- ✅ AI Tutor conversations (Claude 3 Sonnet)
- ✅ Generating suggested responses
- ✅ Language learning interactions

### What OpenAI is Used For

- ✅ Audio transcription (Whisper)
- ❌ AI Tutor (only if you set `AI_PROVIDER=openai`)

## 4. Cost Comparison

| Service | Model | Cost |
|---------|-------|------|
| **Anthropic** | Claude 3 Sonnet | ~$0.003 per 1K input tokens, ~$0.015 per 1K output tokens |
| **OpenAI** | GPT-4 Turbo | ~$0.01 per 1K input tokens, ~$0.03 per 1K output tokens |
| **OpenAI** | Whisper STT | ~$0.006 per minute of audio |

**Anthropic is cheaper** for conversations, which is why it's a great choice if you have credits!

## 5. Test Your Setup

After configuring, start your server:

```bash
cd server
npm run dev
```

The server will use Claude for all AI tutor conversations automatically.

## 6. Switching Back to OpenAI

If you want to switch back to OpenAI GPT-4:

```env
AI_PROVIDER=openai
```

You'll still need both API keys since Whisper (STT) always uses OpenAI.

