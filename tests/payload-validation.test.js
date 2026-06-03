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
const sampleAuditRecord = JSON.parse(
  fs.readFileSync('examples/audit-replay/v08f-read-only-run-record.json', 'utf8')
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

test('local production workflow contracts validate happy-path samples', () => {
  const recoveryPolicy = {
    policy_version: 'v0.17-local-recovery-policy',
    run_id: 'gd_v017_sample_001',
    task_id: 'task_v017_sample_001',
    error_class: 'provider_error',
    decision: 'retry',
    max_retries: 2,
    retry_count: 0,
    timeout_minutes: 30,
    reason: 'Provider returned a transient error before producing reviewable output.'
  };

  const providerRunSummary = {
    summary_version: 'v0.16-provider-run-summary',
    run_id: 'gd_v016_sample_001',
    task_id: 'task_v016_sample_001',
    provider: {
      mode: 'real-readonly',
      name: 'openai-compatible-readonly',
      model: 'deepseek-v4-pro'
    },
    status: 'needs_review',
    latency_ms: 1200,
    score: 0.75,
    error: null
  };

  const actionDraft = {
    draft_version: 'v0.19-local-action-draft',
    run_id: sampleAuditRecord.run_id,
    task_id: sampleAuditRecord.task_id,
    goal_summary: sampleAuditRecord.goal_summary,
    safety: {
      draft_only: true,
      write_actions_enabled: false,
      requires_human_review: true
    },
    codex_prompt: 'Review the sanitized run and do not execute write actions.',
    github_issue_draft: 'Draft issue for human review only.',
    commit_message: 'chore: review local agent run gd_v08f_replay_001',
    test_commands: ['npm test', 'npm run workflow:validate:all', 'npm run demo:local']
  };

  assert.equal(validatePayload('recoveryPolicy', recoveryPolicy).valid, true);
  assert.equal(validatePayload('providerRunSummary', providerRunSummary).valid, true);
  assert.equal(validatePayload('actionDraft', actionDraft).valid, true);
});
