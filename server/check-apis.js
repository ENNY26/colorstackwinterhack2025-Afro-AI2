require('dotenv').config();

console.log('🔍 Checking API Configuration...\n');

let allConfigured = true;

// Check OpenAI (Required for Whisper)
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your-')) {
  console.log('❌ OPENAI_API_KEY: Not configured (REQUIRED for Speech-to-Text)');
  allConfigured = false;
} else {
  console.log('✅ OPENAI_API_KEY: Configured');
}

// Check Anthropic (Recommended for AI Tutor)
if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('your-')) {
  console.log('❌ ANTHROPIC_API_KEY: Not configured (REQUIRED for AI conversations)');
  allConfigured = false;
} else {
  console.log('✅ ANTHROPIC_API_KEY: Configured');
}

// Check ElevenLabs (Optional - will use device TTS as fallback)
if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY.includes('your-')) {
  console.log('⚠️  ELEVENLABS_API_KEY: Not configured (OPTIONAL - will use device TTS as fallback)');
} else {
  console.log('✅ ELEVENLABS_API_KEY: Configured');
}

if (!process.env.ELEVENLABS_VOICE_ID || process.env.ELEVENLABS_VOICE_ID.includes('your-')) {
  console.log('⚠️  ELEVENLABS_VOICE_ID: Not configured (OPTIONAL - will use device TTS as fallback)');
} else {
  console.log('✅ ELEVENLABS_VOICE_ID: Configured');
}

// Check MongoDB
if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('localhost:27017')) {
  console.log('⚠️  MONGODB_URI: Using local MongoDB (make sure MongoDB is running)');
} else {
  console.log('✅ MONGODB_URI: Configured');
}

// Check JWT
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('your-')) {
  console.log('⚠️  JWT_SECRET: Using default (change in production)');
} else {
  console.log('✅ JWT_SECRET: Configured');
}

// Twilio Verify (phone OTP)
const twilioOk =
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_VERIFY_SERVICE_SID &&
  !process.env.TWILIO_ACCOUNT_SID.includes('your-');
if (!twilioOk) {
  console.log('⚠️  Twilio Verify: Not configured (dev OTP fallback: 123456)');
} else {
  console.log('✅ Twilio Verify: Configured');
}

// Check AI Provider
const aiProvider = process.env.AI_PROVIDER || 'anthropic';
console.log(`📊 AI_PROVIDER: ${aiProvider}`);

console.log('\n' + '='.repeat(50));
if (allConfigured) {
  console.log('✅ All required APIs are configured!');
  console.log('\nNext steps:');
  console.log('1. Start MongoDB (if using local)');
  console.log('2. Run: npm run dev');
  console.log('3. Test: curl http://localhost:5000/health');
} else {
  console.log('❌ Some required APIs are missing!');
  console.log('\nPlease:');
  console.log('1. Edit server/.env file');
  console.log('2. Add all required API keys');
  console.log('3. See server/SETUP_GUIDE.md for details');
}
console.log('='.repeat(50));

