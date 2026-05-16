import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { validatePayload } from '../src/utils/validatePayload.js';

const sampleGoal = JSON.parse(fs.readFileSync('examples/sample_goal_request.json', 'utf8'));
const sampleSuccessResult = JSON.parse(
  fs.readFileSync('examples/sample_agent_result_success.json', 'utf8')
);
const sampleFailedResult = JSON.parse(
  fs.readFileSync('examples/sample_agent_result_failed.json', 'utf8')
);

test('sample goal request matches goal schema', () => {
  const result = validatePayload('goal', sampleGoal);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('goal request without goal fails validation clearly', () => {
  const payload = { ...sampleGoal };
  delete payload.goal;

  const result = validatePayload('goal', payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('missing required field goal')));
});

test('goal request without criteria fails validation clearly', () => {
  const payload = { ...sampleGoal };
  delete payload.criteria;

  const result = validatePayload('goal', payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('missing required field criteria')));
});

test('goal request rejects max_iterations above 5', () => {
  const result = validatePayload('goal', { ...sampleGoal, max_iterations: 6 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('expected value <= 5')));
});

test('sample success result matches result schema', () => {
  const result = validatePayload('result', sampleSuccessResult);
  assert.equal(result.valid, true);
});

test('sample failed result matches result schema', () => {
  const result = validatePayload('result', sampleFailedResult);
  assert.equal(result.valid, true);
});

