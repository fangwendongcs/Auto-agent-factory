import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { scoreCriteria, shouldStopRun } from '../src/utils/scoreCriteria.js';

const sampleGoal = JSON.parse(fs.readFileSync('examples/sample_goal_request.json', 'utf8'));
const sampleSuccessResult = JSON.parse(
  fs.readFileSync('examples/sample_agent_result_success.json', 'utf8')
);
const sampleFailedResult = JSON.parse(
  fs.readFileSync('examples/sample_agent_result_failed.json', 'utf8')
);

test('successful evidence passes every criterion', () => {
  const result = scoreCriteria(sampleGoal.criteria, sampleSuccessResult.evidence);

  assert.equal(result.criteria_met, true);
  assert.equal(result.score, 1);
  assert.equal(result.next_iteration_instruction, null);
  assert.ok(result.checks.every((check) => check.status === 'pass'));
});

test('failed evidence produces a follow-up instruction', () => {
  const result = scoreCriteria(sampleGoal.criteria, sampleFailedResult.evidence);

  assert.equal(result.criteria_met, false);
  assert.equal(result.score, 0.4);
  assert.match(result.next_iteration_instruction, /失败重试逻辑/);
  assert.match(result.next_iteration_instruction, /人工审核节点/);
});

test('missing evidence becomes unknown rather than fabricated pass', () => {
  const result = scoreCriteria(['criterion A'], []);

  assert.equal(result.criteria_met, false);
  assert.equal(result.score, 0.5);
  assert.equal(result.checks[0].status, 'unknown');
});

test('run stops when max iterations are reached', () => {
  const decision = shouldStopRun({
    criteriaMet: false,
    iteration: 5,
    maxIterations: 5,
    elapsedMinutes: 10,
    timeoutMinutes: 30
  });

  assert.deepEqual(decision, {
    should_stop: true,
    stop_reason: 'max_iterations_reached'
  });
});

test('run stops when timeout is reached', () => {
  const decision = shouldStopRun({
    criteriaMet: false,
    iteration: 2,
    maxIterations: 5,
    elapsedMinutes: 30,
    timeoutMinutes: 30
  });

  assert.deepEqual(decision, {
    should_stop: true,
    stop_reason: 'timed_out'
  });
});

