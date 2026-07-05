const twilio = require('twilio');
const { normalizePhoneE164 } = require('../utils/phone');

let client = null;

function isTwilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_VERIFY_SERVICE_SID &&
    !process.env.TWILIO_ACCOUNT_SID.includes('your-')
  );
}

function getClient() {
  if (!isTwilioConfigured()) return null;
  if (!client) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

/**
 * Send SMS verification code via Twilio Verify.
 * Falls back to dev mode (OTP 123456) if Twilio is not configured OR the
 * Twilio request fails (e.g. invalid credentials) — so auth never 500s.
 */
async function sendVerificationCode(rawPhone) {
  const phone = normalizePhoneE164(rawPhone);

  const twilioClient = getClient();
  if (!twilioClient) {
    console.log(`[DEV] Twilio not configured — use OTP 123456 for ${phone}`);
    return { phone, devMode: true };
  }

  try {
    const verification = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: 'sms' });

    return { phone, sid: verification.sid, status: verification.status };
  } catch (err) {
    console.warn(
      `[Twilio] sendVerificationCode failed (${err.code || err.status || 'error'}): ${err.message}. ` +
        'Falling back to DEV OTP 123456.'
    );
    return { phone, devMode: true, twilioError: true };
  }
}

/**
 * Check OTP. Accepts 123456 in dev mode or when Twilio verification fails.
 */
async function checkVerificationCode(rawPhone, code) {
  const phone = normalizePhoneE164(rawPhone);
  const trimmedCode = String(code || '').trim();

  if (!trimmedCode) {
    return { approved: false, message: 'Code is required' };
  }

  const twilioClient = getClient();
  if (!twilioClient) {
    const approved = trimmedCode === '123456';
    return {
      approved,
      phone,
      devMode: true,
      message: approved ? 'approved' : 'Invalid code (dev: use 123456)',
    };
  }

  try {
    const check = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code: trimmedCode });

    return {
      approved: check.status === 'approved',
      phone,
      status: check.status,
      message: check.status,
    };
  } catch (err) {
    console.warn(
      `[Twilio] checkVerificationCode failed (${err.code || err.status || 'error'}): ${err.message}. ` +
        'Falling back to DEV OTP 123456.'
    );
    const approved = trimmedCode === '123456';
    return {
      approved,
      phone,
      devMode: true,
      twilioError: true,
      message: approved ? 'approved' : 'Invalid code (dev: use 123456)',
    };
  }
}

module.exports = {
  sendVerificationCode,
  checkVerificationCode,
  isTwilioConfigured,
};
