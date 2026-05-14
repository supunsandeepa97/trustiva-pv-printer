const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.warn('[SECURITY] JWT_SECRET and JWT_REFRESH_SECRET are not set. Set these environment variables immediately — do not use in production without them.');
}

const ACCESS_SECRET  = process.env.JWT_SECRET          || 'dev_access_secret_change_me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET   || 'dev_refresh_secret_change_me';
const ACCESS_TTL     = process.env.JWT_EXPIRES_IN       || '8h';
const REFRESH_TTL    = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function sign(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

function verify(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function signRefresh(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

function verifyRefresh(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = { sign, verify, signRefresh, verifyRefresh };
