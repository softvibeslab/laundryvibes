function notFound(req, res) {
  res.status(404).json({ message: 'Ruta no encontrada' });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const isTooLarge = err.type === 'entity.too.large' || (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE');
  const isBadUpload = err.name === 'MulterError' && !isTooLarge;
  const status = err.status || (isTooLarge ? 413 : (isBadUpload ? 400 : 500));
  if (status >= 500) console.error('Request failed', { method: req.method, path: req.path, name: err.name });
  const message = status === 413 ? 'La carga útil es demasiado grande' : (isBadUpload ? 'La carga de evidencia no es válida' : (status >= 500 ? 'Error interno del servidor' : err.message));
  res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
