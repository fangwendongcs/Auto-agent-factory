import assert from 'node:assert/strict';
import test from 'node:test';
import { generateRecoveryPolicy } from '../src/utils/generateRecoveryPolicy.js';
import { validatePayload } from '../src/utils/validatePayload.js';

test('generateRecoveryPolicy retries transient provider timeout within budget', () => {
  const policy = generateRecoveryPolicy({
    run_id: 'gd_v017_retry_001',
    task_id: 'task_v017_retry_001',
    provider_error: {
      class: 'provider_timeout',
      message: 'Provider timed out before returning reviewable output.'
    },
    retry_count: 1,
    max_retries: 2
  });

  assert.equal(policy.decision, 'retry');
  assert.equal(policy.next_action, 'retry_provider_readonly');
  assert.equal(policy.error_class, 'provider_timeout');
  assert.equal(policy.safety.write_actions_enabled, false);
  assert.equal(policy.safety.requires_human_review, true);
  assert.equal(validatePayload('recoveryPolicy', policy).valid, true);
});

test('generateRecoveryPolicy stops transient provider failures after retry limit', () => {
  const policy = generateRecoveryPolicy({
    run_id: 'gd_v017_stop_001',
    task_id: 'task_v017_stop_001',
    provider_error: {
      class: 'provider_output_truncated',
      message: 'Provider output was truncated.'
    },
    retry_count: 2,
    max_retries: 2
  });

  assert.equal(policy.decision, 'stop');
  assert.equal(policy.next_action, 'stop_run');
  assert.deepEqual(policy.stop_conditions, ['retry_budget_exhausted']);
  assert.equal(validatePayload('recoveryPolicy', policy).valid, true);
});

test('generateRecoveryPolicy sends malformed provider output to human review', () => {
  const policy = generateRecoveryPolicy({
    run_id: 'gd_v017_review_001',
    task_id: 'task_v017_review_001',
    provider_error: {
      class: 'provider_invalid_json',
      message: 'Provider response could not be parsed as JSON.'
    }
  });

  assert.equal(policy.decision, 'needs_review');
  assert.equal(policy.next_action, 'manual_review');
  assert.equal(policy.safety.requires_human_review, true);
  assert.equal(validatePayload('recoveryPolicy', policy).valid, true);
});

test('generateRecoveryPolicy stops forbidden actions immediately', () => {
  const policy = generateRecoveryPolicy({
    run_id: 'gd_v017_forbidden_001',
    task_id: 'task_v017_forbidden_001',
    error_class: 'forbidden_action',
    retry_count: 0
  });

  assert.equal(policy.decision, 'stop');
  assert.equal(policy.next_action, 'stop_run');
  assert.ok(policy.stop_conditions.includes('forbidden_action_is_not_recoverable_by_retry'));
});

test('generateRecoveryPolicy refuses secret-like content', () => {
  assert.throws(
    () => generateRecoveryPolicy({
      run_id: 'gd_v017_secret_001',
      task_id: 'task_v017_secret_001',
      provider_error: {
        class: 'provider_error',
        message: ['Bear' + 'er', 'fake-secret-like-value'].join(' ')
      }
    }),
    /secret-like content/
  );
});
