const orderStatusLabels = {
  Pending: 'Pendiente',
  'In Progress': 'En proceso',
  Completed: 'Completado',
  Delivered: 'Entregado',
};

const stockStatusLabels = {
  Low: 'Bajo',
  Medium: 'Medio',
  High: 'Alto',
};

const stockItemLabels = {
  Detergent: 'Detergente',
  'Fabric Softener': 'Suavizante',
  Soap: 'Jabón',
  Bleach: 'Lejía',
  Starch: 'Almidón',
};

const stockUnitLabels = {
  Liters: 'litros',
  Kg: 'kg',
  Pieces: 'piezas',
  L: 'L',
};

const consumptionReasonLabels = {
  'Daily Consumption': 'Consumo diario',
  Spillage: 'Derrame',
  Waste: 'Desperdicio',
  Other: 'Otro',
};

const legacyApiMessages = {
  'Authentication required': 'Se requiere autenticación',
  'Invalid or expired credentials': 'Las credenciales no son válidas o han expirado',
  'Insufficient permissions': 'No tienes permisos suficientes',
  'Route not found': 'Ruta no encontrada',
  'Payload too large': 'La carga útil es demasiado grande',
  'Internal server error': 'Error interno del servidor',
  'Origin not allowed': 'Origen no permitido',
  'All fields are required.': 'Todos los campos son obligatorios.',
  'Passwords must match and contain at least 8 characters.': 'Las contraseñas deben coincidir y contener al menos 8 caracteres.',
  'An account with those details already exists.': 'Ya existe una cuenta con esos datos.',
  'User registered successfully': 'Usuario registrado correctamente',
  'Email and password are required': 'El correo electrónico y la contraseña son obligatorios',
  'Email and password are required.': 'El correo electrónico y la contraseña son obligatorios.',
  'Invalid email or password': 'El correo electrónico o la contraseña no son válidos',
  'Invalid credentials': 'Credenciales no válidas',
  'Login successful': 'Inicio de sesión correcto',
  'If that account exists, reset instructions will be sent.': 'Si esa cuenta existe, se enviarán las instrucciones para restablecer la contraseña.',
  'Invalid or expired token': 'El enlace no es válido o ha expirado',
  'Password updated successfully': 'Contraseña actualizada correctamente',
  'New password must contain at least 8 characters': 'La nueva contraseña debe contener al menos 8 caracteres',
  'Current password is incorrect': 'La contraseña actual es incorrecta',
  'User not found': 'Usuario no encontrado',
  'User not found.': 'Usuario no encontrado.',
  'User not Found': 'Usuario no encontrado',
  'Phone Number is alredy in use': 'El número de teléfono ya está en uso',
  'Profile Update Successfully': 'Perfil actualizado correctamente',
  'Number of clothes must be a positive integer': 'El número de prendas debe ser un número entero positivo',
  'Weight must be greater than zero': 'El peso debe ser mayor que cero',
  'Order submitted successfully': 'Pedido enviado correctamente',
  'No order found': 'No se encontraron pedidos',
  'Order not found': 'Pedido no encontrado',
  'Order status updated': 'Estado del pedido actualizado',
  'Complaint submitted successfully': 'Reclamación enviada correctamente',
  'Worker already exists with this email.': 'Ya existe un trabajador con este correo electrónico.',
  'Worker added successfully': 'Trabajador añadido correctamente',
  'Initial stock items created': 'Artículos iniciales del inventario creados',
  'Stock items retrieved successfully': 'Artículos del inventario obtenidos correctamente',
  'Error retrieving stock items': 'Error al obtener los artículos del inventario',
  'Stock item not found': 'Insumo no encontrado',
  'Stock item retrieved successfully': 'Insumo obtenido correctamente',
  'Error retrieving stock item': 'Error al obtener el insumo',
  'itemName and currentQuantity are required': 'El nombre del insumo y la cantidad actual son obligatorios',
  'Stock item already exists': 'El insumo ya existe',
  'Stock item created successfully': 'Insumo creado correctamente',
  'Error creating stock item': 'Error al crear el insumo',
  'Quantity used must be greater than 0': 'La cantidad utilizada debe ser mayor que 0',
  'Insufficient stock. Cannot record consumption.': 'Inventario insuficiente. No se puede registrar el consumo.',
  'Consumption recorded successfully': 'Consumo registrado correctamente',
  'Error recording consumption': 'Error al registrar el consumo',
  'Quantity to add must be greater than 0': 'La cantidad que se añadirá debe ser mayor que 0',
  'Stock added successfully': 'Inventario añadido correctamente',
  'Error adding stock': 'Error al añadir inventario',
  'Stock item updated successfully': 'Insumo actualizado correctamente',
  'Error updating stock item': 'Error al actualizar el insumo',
  'Stock analytics retrieved successfully': 'Análisis del inventario obtenido correctamente',
  'Error retrieving stock analytics': 'Error al obtener el análisis del inventario',
  'Consumption history retrieved successfully': 'Historial de consumo obtenido correctamente',
  'Error retrieving consumption history': 'Error al obtener el historial de consumo',
  'All alerts retrieved successfully': 'Todas las alertas se obtuvieron correctamente',
  'Error retrieving alerts': 'Error al obtener las alertas',
  'Stock item deleted successfully': 'Insumo eliminado correctamente',
  'Error deleting stock item': 'Error al eliminar el insumo',
  'An error occurred. Please try again.': 'Ocurrió un error. Inténtalo de nuevo.',
  'Network Error': 'Error de red. Comprueba tu conexión e inténtalo de nuevo.',
};

const looksLikeEnglishMessage = (message) =>
  /\b(?:authentication|credentials|required|invalid|expired|not found|already exists|password|email|order|stock|consumption|error|failed|successful|please try|network)\b/i.test(message);

export const orderStatusLabel = (status) => orderStatusLabels[status] || status || 'Sin estado';
export const stockStatusLabel = (status) => stockStatusLabels[status] || status || 'Sin estado';
export const stockItemLabel = (itemName) => stockItemLabels[itemName] || itemName || 'Insumo';
export const stockUnitLabel = (unit) => stockUnitLabels[unit] || unit || '';
export const consumptionReasonLabel = (reason) => consumptionReasonLabels[reason] || reason || 'Sin motivo';

export const apiMessageEs = (message, fallback = 'Ocurrió un error. Inténtalo de nuevo.') => {
  if (!message) return fallback;
  if (legacyApiMessages[message]) return legacyApiMessages[message];
  return looksLikeEnglishMessage(message) ? fallback : message;
};

export const stockAlertMessageEs = (message, itemName) => {
  if (!message) return 'Alerta de inventario';
  const item = stockItemLabel(itemName);
  if (message.includes('has fallen below reorder level')) {
    return `El inventario de ${item} cayó por debajo del nivel de reposición`;
  }
  if (message.includes('is getting low')) {
    return `El inventario de ${item} se está agotando; supervisa el consumo de cerca`;
  }
  return apiMessageEs(message, 'Alerta de inventario');
};

export const formatDateEs = (value, options = {}) => {
  if (!value) return 'No disponible';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-MX', options).format(date);
};

export const formatDateTimeEs = (value) =>
  formatDateEs(value, { dateStyle: 'medium', timeStyle: 'short' });

const legacyOrderDate = (order) => {
  if (order?.createdAt) return new Date(order.createdAt);
  if (!order?.date) return null;
  return new Date(`${order.date}${order.time ? ` ${order.time}` : ''}`);
};

export const formatOrderDateEs = (order) => {
  const date = legacyOrderDate(order);
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(date)
    : order?.date || 'No disponible';
};

export const formatOrderTimeEs = (order) => {
  const date = legacyOrderDate(order);
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('es-MX', { timeStyle: 'short' }).format(date)
    : order?.time || 'No disponible';
};
