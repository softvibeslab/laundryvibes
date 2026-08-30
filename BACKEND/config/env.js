const dotenv = require('dotenv');

dotenv.config();

function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const required = ['MONGODB_URL', 'JWT_SECRET', 'FRONTEND_URL'];
  const missing = required.filter((key) => !env[key]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  if (production && env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters in production');

  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535');

  let frontendUrl;
  try { frontendUrl = new URL(env.FRONTEND_URL).origin; } catch { throw new Error('FRONTEND_URL must be an absolute URL'); }
  const origins = (env.CORS_ORIGINS || frontendUrl).split(',').map((v) => v.trim()).filter(Boolean);
  origins.forEach((origin) => { try { new URL(origin); } catch { throw new Error(`Invalid CORS origin: ${origin}`); } });

  const positiveInteger = (name, fallback) => {
    const value = Number(env[name] || fallback);
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
    return value;
  };

  return Object.freeze({
    nodeEnv: env.NODE_ENV || 'development', port, host: env.HOST || '127.0.0.1',
    mongoUrl: env.MONGODB_URL, jwtSecret: env.JWT_SECRET, frontendUrl,
    corsOrigins: origins, payloadLimit: env.PAYLOAD_LIMIT || '100kb',
    jwtExpiresIn: env.JWT_EXPIRES_IN || '1h', resetTtlMinutes: positiveInteger('RESET_TOKEN_TTL_MINUTES', 15),
    loginRateLimit: positiveInteger('LOGIN_RATE_LIMIT', 10),
    resetRateLimit: positiveInteger('RESET_RATE_LIMIT', 5),
    writeRateLimit: positiveInteger('WRITE_RATE_LIMIT', 120),
  });
}

module.exports = { loadConfig };
