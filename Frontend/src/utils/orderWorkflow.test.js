import test from 'node:test';
import assert from 'node:assert/strict';
import { availableOrderActions, canOperate, canUsePos } from './orderWorkflow.js';

const worker = '507f1f77bcf86cd799439013';
const priced = { status: 'In Progress', assignedWorker: { id: worker }, pricing: { total: 100 }, payment: { status: 'pending' } };

test('worker operation and POS contracts require exact assignment', () => {
  assert.equal(canOperate(priced, 'worker', worker), true);
  assert.equal(canOperate(priced, 'worker', 'another'), false);
  assert.equal(canOperate({ ...priced, assignedWorker: null }, 'worker', worker), false);
  assert.equal(canUsePos(priced, 'worker', worker, true), true);
  assert.equal(canUsePos(priced, 'worker', 'another', true), false);
  assert.equal(canUsePos({ ...priced, assignedWorker: null }, 'worker', worker, true), false);
});

test('POS contract also requires configuration, pricing and unpaid order', () => {
  assert.equal(canUsePos(priced, 'admin', '', true), true);
  assert.equal(canUsePos(priced, 'admin', '', false), false);
  assert.equal(canUsePos({ ...priced, pricing: null }, 'admin', '', true), false);
  assert.equal(canUsePos({ ...priced, payment: { status: 'paid' } }, 'admin', '', true), false);
});

test('unassigned worker can claim but cannot transition until assignment is observed', () => {
  const actions = availableOrderActions({ ...priced, status: 'Pending', assignedWorker: null }, 'worker', worker);
  assert.deepEqual(actions, { canAssign: true, canTransition: false, canCancel: false, canReopen: false });
});
