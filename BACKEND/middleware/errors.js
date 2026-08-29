function notFound(req, res) {
  res.status(404).json({ message: 'Ruta no encontrada' });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || (err.type === 'entity.too.large' ? 413 : 500);
  if (status >= 500) console.error('Request failed', { method: req.method, path: req.path, name: err.name });
  const message = status === 413 ? 'La carga útil es demasiado grande' : (status >= 500 ? 'Error interno del servidor' : err.message);
  res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
