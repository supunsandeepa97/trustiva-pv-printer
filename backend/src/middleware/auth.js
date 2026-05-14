const { verify } = require('../config/jwt');
const { error } = require('../utils/apiResponse');

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'No token provided', 401);
  }
  try {
    const token = authHeader.slice(7);
    const payload = verify(token);
    req.user = payload;
    next();
  } catch (err) {
    return error(res, 'Invalid or expired token', 401);
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return error(res, 'Insufficient permissions', 403);
    }
    next();
  };
}

function requirePlatformAdmin(req, res, next) {
  if (!req.user?.is_platform_admin) {
    return error(res, 'Platform admin access required', 403);
  }
  next();
}

module.exports = { verifyToken, requireRole, requirePlatformAdmin };
