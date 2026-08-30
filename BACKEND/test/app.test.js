const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { loadConfig } = require('../config/env');
const { createApp } = require('../app');
const User = require('../models/user');
const Worker = require('../models/Worker/workerModel');
const { publicUser, registerUser } = require('../controllers/user/Authentification/userController');
const { createWorker } = require('../controllers/Admin/worker-Controller/workerController');
const { normalizeEmail, isValidEmail, isValidPassword } = require('../utils/credentials');
const { errorHandler } = require('../middleware/errors');

const env = { NODE_ENV: 'test', MONGODB_URL: 'mongodb://mongo/test', JWT_SECRET: 'test-secret-at-least-thirty-two-characters', FRONTEND_URL: 'https://app.example.com', CORS_ORIGINS: 'https://app.example.com' };
const config = { ...loadConfig(env), accountLookup: async (claims) => ({ role: claims.role, active: true, tokenVersion: claims.tokenVersion || 0 }), transactionRunner: async (work) => work({ id: 'test-session' }) };
const app = createApp(config);

const token = (role) => jwt.sign({ userId: '507f1f77bcf86cd799439011', role }, config.jwtSecret);

const mockResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(value) { this.body = value; return this; },
});

test('environment validation rejects missing and weak production secrets', () => {
  assert.throws(() => loadConfig({}), /Missing required/);
  assert.throws(() => loadConfig({ ...env, NODE_ENV: 'production', JWT_SECRET: 'short' }), /at least 32/);
});

test('credential rules normalize email and reject invalid operational credentials', async () => {
  assert.equal(normalizeEmail('  WORKER@Example.COM '), 'worker@example.com');
  assert.equal(isValidEmail('worker@example.com'), true);
  assert.equal(isValidEmail('worker-at-example'), false);
  assert.equal(isValidPassword('1234567'), false);
  assert.equal(isValidPassword('12345678'), true);

  const invalidEmail = mockResponse();
  await createWorker(
    { body: { email: 'not-an-email', password: '12345678' } },
    invalidEmail,
    (error) => { throw error; },
  );
  assert.equal(invalidEmail.statusCode, 400);

  const weakPassword = mockResponse();
  await createWorker(
    { body: { email: 'worker@example.com', password: '1234567' } },
    weakPassword,
    (error) => { throw error; },
  );
  assert.equal(weakPassword.statusCode, 400);
});

test('worker creation refuses an email already used by a customer account', async () => {
  const originalWorkerFindOne = Worker.findOne;
  const originalUserFindOne = User.findOne;
  Worker.findOne = async () => null;
  User.findOne = async () => ({ _id: '507f1f77bcf86cd799439011' });

  try {
    const response = mockResponse();
    await createWorker(
      { body: { email: 'cliente@example.com', password: 'password-seguro' } },
      response,
      (error) => { throw error; },
    );
    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.body, { message: 'Ya existe una cuenta con este correo electrónico.' });
  } finally {
    Worker.findOne = originalWorkerFindOne;
    User.findOne = originalUserFindOne;
  }
});

test('public registration refuses an email already reserved by a worker', async () => {
  const originalUserExists = User.exists;
  const originalWorkerExists = Worker.exists;
  const originalUserCreate = User.create;
  User.exists = async () => false;
  Worker.exists = async () => true;
  User.create = async () => assert.fail('User.create must not run for a reserved worker email');

  try {
    const response = mockResponse();
    await registerUser(
      {
        body: {
          name: 'Cliente', email: 'worker@example.com', phoneNumber: '5551234567',
          buildingName: 'Edificio', roomNumber: '101', bagNumber: 'B-1',
          password: 'password-seguro', confirmPassword: 'password-seguro',
        },
      },
      response,
      (error) => { throw error; },
    );
    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.body, { message: 'Ya existe una cuenta con esos datos.' });
  } finally {
    User.exists = originalUserExists;
    Worker.exists = originalWorkerExists;
    User.create = originalUserCreate;
  }
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
  assert.equal(Worker.schema.path('email').options.lowercase, true);
  assert.deepEqual(Worker.schema.path('role').options.enum, ['worker', 'admin']);
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
