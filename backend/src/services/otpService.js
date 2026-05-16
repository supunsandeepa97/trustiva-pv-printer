// In-memory OTP store — one active OTP at a time for platform delete actions
const store = new Map();

function generate() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function set(companyId) {
  const otp = generate();
  store.set('platform_delete', { otp, companyId, expiresAt: Date.now() + 10 * 60 * 1000 });
  return otp;
}

function verify(otp, companyId) {
  const entry = store.get('platform_delete');
  if (!entry) return false;
  if (entry.companyId !== companyId) return false;
  if (Date.now() > entry.expiresAt) { store.delete('platform_delete'); return false; }
  if (entry.otp !== otp) return false;
  store.delete('platform_delete');
  return true;
}

module.exports = { set, verify };
