// Settings keys used internally to store OTPs. These must never be
// readable or writable through the general-purpose settings/company APIs.
function isReservedKey(key) {
  return key === 'delete_otp' || key.startsWith('otp_');
}

module.exports = { isReservedKey };
