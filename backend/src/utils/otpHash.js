const crypto = require('crypto');

// A bare SHA-256 of a 6-digit OTP is fully precomputable (only 900,000
// possible values) — if the stored hash ever leaks (e.g. via the backup DB
// sync, which replicates the settings table), an attacker recovers the OTP
// instantly from a rainbow table. HMAC with a server-side secret pepper
// makes the hash useless without that secret, regardless of OTP entropy.
if (!process.env.OTP_PEPPER) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[SECURITY] OTP_PEPPER must be set in production — refusing to start with an unpeppered OTP hash.');
  }
  console.warn('[SECURITY] OTP_PEPPER not set — using an insecure dev default. Do NOT use in production.');
}
const PEPPER = process.env.OTP_PEPPER || 'dev_otp_pepper_change_me';

function hashOtp(otp) {
  return crypto.createHmac('sha256', PEPPER).update(otp).digest('hex');
}

function otpHashEquals(a, b) {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = { hashOtp, otpHashEquals };
