const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { loadConfig } = require('../config/env');
const { createApp } = require('../app');
const User = require('../models/user');
const Worker = require('../models/Worker/workerModel');
const { publicUser } = require('../controllers/user/Authentification/userController');
const { errorHandler } = require('../middleware/errors');

const env = { NODE_ENV: 'test', MONGODB_URL: 'mongodb://mongo/test', JWT_SECRET: 'test-secret-at-least-thirty-two-characters', FRONTEND_URL: 'https://app.example.com', CORS_ORIGINS: 'https://app.example.com' };
const config = loadConfig(env);
const app = createApp(config);

const token = (role) => jwt.sign({ userId: '507f1f77bcf86cd799439011', role }, config.jwtSecret);

test('environment validation rejects missing and weak production secrets', () => {
  assert.throws(() => loadConfig({}), /Missing required/);
  assert.throws(() => loadConfig({ ...env, NODE_ENV: 'production', JWT_SECRET: 'short' }), /at least 32/);
});

test('health endpoint includes security headers and CORS allowlist', async () => {
  const response = await request(app).get('/api/health/live').set('Origin', 'https://app.example.com');
  assert.equal(response.status, 200);
  assert.equal(response.headers['access-control-allow-origin'], 'https://app.example.com');
  assert.ok(response.headers['content-security-policy']);
  const denied = await request(app).get('/api/health/live').set('Origin', 'https://evil.example');
  assert.equal(denied.status, 403);
});

test('protected worker and stock endpoints enforce JWT and RBAC before database access', async () => {
  assert.equal((await request(app).get('/api/worker/getallorderdetails')).status, 401);
  assert.equal((await request(app).get('/api/worker/getallorderdetails').set('Authorization', `Bearer ${token('user')}`)).status, 403);
  assert.equal((await request(app).get('/api/stock/all').set('Authorization', `Bearer ${token('user')}`)).status, 403);
  assert.equal((await request(app).post('/api/admin/add-worker').set('Authorization', `Bearer ${token('worker')}`).send({})).status, 403);
});

test('complaints require a user and payload size is bounded', async () => {
  assert.equal((await request(app).post('/api/user/submit-complaint').send({})).status, 401);
  const response = await request(app).post('/api/user/signup').send({ name: 'x'.repeat(120_000) });
  assert.equal(response.status, 413);
  assert.deepEqual(response.body, { message: 'La carga útil es demasiado grande' });
});

test('unknown routes return a JSON 404', async () => {
  const response = await request(app).get('/api/nope');
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { message: 'Ruta no encontrada' });
});

test('credential/reset fields are excluded by default and public DTOs are allowlisted', () => {
  assert.equal(User.schema.path('password').options.select, false);
  assert.equal(User.schema.path('resetPasswordToken').options.select, false);
  assert.equal(User.schema.path('resetPasswordExpires').options.select, false);
  assert.equal(Worker.schema.path('password').options.select, false);
  const dto = publicUser({
    _id: '507f1f77bcf86cd799439011', name: 'Test', email: 'test@example.com', role: 'user',
    password: 'hash', resetPasswordToken: 'secret', phoneNumber: 'private',
  });
  assert.deepEqual(dto, {
    id: '507f1f77bcf86cd799439011', name: 'Test', email: 'test@example.com', role: 'user',
  });
});

test('500 responses do not disclose internal exception messages', () => {
  let statusCode;
  let body;
  errorHandler(
    new Error('database host and credential details'),
    { method: 'GET', path: '/private' },
    { status(code) { statusCode = code; return this; }, json(value) { body = value; } },
    () => {},
  );
  assert.equal(statusCode, 500);
  assert.deepEqual(body, { message: 'Error interno del servidor' });
});
