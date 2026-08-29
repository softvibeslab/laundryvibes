function notFound(req, res) {
  res.status(404).json({ message: 'Route not found' });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || (err.type === 'entity.too.large' ? 413 : 500);
  if (status >= 500) console.error('Request failed', { method: req.method, path: req.path, name: err.name });
  const message = status === 413 ? 'Payload too large' : (status >= 500 ? 'Internal server error' : err.message);
  res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
