function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err.message);

  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: err.message });
  }

  const status  = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message;

  res.status(status).json({ success: false, message });
}

module.exports = errorHandler;
