const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const isValidEmail = (value) => {
  const email = normalizeEmail(value);
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidPassword = (value) => String(value || '').length >= 8;

module.exports = { normalizeEmail, isValidEmail, isValidPassword };
