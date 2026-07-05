/**
 * Normalize phone to E.164 for Twilio.
 *
 * If the input already includes an explicit `+` country code (e.g. "+13475560841"),
 * it is respected as-is — we never prepend a default. Only when no `+` is present
 * do we apply `defaultCountryCode` (handling Nigeria's leading-0 local format).
 */
function normalizePhoneE164(raw, defaultCountryCode = '1') {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Phone number is required');
  }

  const trimmed = raw.trim();
  const hasCountryCode = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D/g, '');

  if (!digits) {
    throw new Error('Invalid phone number');
  }

  if (!hasCountryCode) {
    // No explicit country code — apply the default.
    if (digits.startsWith('0') && defaultCountryCode === '234') {
      // Nigeria local: 0803... → 234803...
      digits = defaultCountryCode + digits.slice(1);
    } else if (!digits.startsWith(defaultCountryCode)) {
      digits = defaultCountryCode + digits;
    }
  }

  const e164 = `+${digits}`;
  if (digits.length < 10 || digits.length > 15) {
    throw new Error('Phone number length is invalid');
  }

  return e164;
}

function maskPhone(e164) {
  if (!e164 || e164.length < 6) return '***';
  return `${e164.slice(0, 3)}***${e164.slice(-4)}`;
}

module.exports = { normalizePhoneE164, maskPhone };
