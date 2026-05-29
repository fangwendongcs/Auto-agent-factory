import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createSanitizedRunRecord } from '../src/utils/sanitizeAuditRecord.js';
import { validatePayload } from '../src/utils/validatePayload.js';

const sampleAuditRecord = JSON.parse(
  fs.readFileSync('examples/sample_sanitized_run_record.json', 'utf8')
);

test('sample sanitized audit record matches audit schema', () => {
  const result = validatePayload('auditRecord', sampleAuditRecord);
  assert.equal(result.valid, true, result.errors.join('; '));
});

test('sanitized audit record keeps approval and provider summaries only', () => {
  const record = createSanitizedRunRecord({
    run_id: 'gd_test_001',
    task_id: 'task_test_001',
    status: 'needs_review',
    goal: 'Generate a read-only plan with a deliberately long prompt-like section that should be summarized rather than stored as a full prompt body.',
    criteria: ['Must include a summary', 'Must include risk summary'],
    risk_level: 'low',
    action_class: 'read_only',
    permission_level: 'read_only',
    provider_call_status: 'response_received',
    agent_result: {
      status: 'needs_review',
      provider: {
        mode: 'real-readonly',
        name: 'openai-compatible-readonly',
        model: 'configured-provider-model'
      }
    },
    approval_decision: {
      decision: 'allow',
      blocked: false,
      approved: false,
      requires_human_approval: false,
      reason: 'Read-only analysis may proceed after validation.'
    },
    provider_request: {
      messages: [{ role: 'user', content: 'SENSITIVE_TEST_VALUE_DO_NOT_KEEP' }]
    },
    provider_response_raw: {
      content: 'SENSITIVE_PROVIDER_RESPONSE_DO_NOT_KEEP'
    },
    authorization: 'Bearer sample',
    credential: 'SENSITIVE_CREDENTIAL_DO_NOT_KEEP'
  }, { now: '2026-05-29T00:00:00.000Z' });

  const serialized = JSON.stringify(record);

  assert.equal(record.audit_record_version, 'v0.8b-sanitized-audit-record');
  assert.equal(record.storage.mode, 'mock_repo_contract');
  assert.equal(record.storage.persisted, false);
  assert.equal(record.safety.no_write_default, true);
  assert.equal(record.safety.side_effects_enabled, false);
  assert.equal(record.safety.raw_prompt_stored, false);
  assert.equal(record.safety.raw_provider_response_stored, false);
  assert.equal(record.safety.secrets_stored, false);
  assert.equal(record.provider.mode, 'real-readonly');
  assert.equal(record.provider.status, 'response_received');
  assert.equal(record.approval_decision.decision, 'allow');
  assert.equal(serialized.includes('SENSITIVE_TEST_VALUE_DO_NOT_KEEP'), false);
  assert.equal(serialized.includes('SENSITIVE_PROVIDER_RESPONSE_DO_NOT_KEEP'), false);
  assert.equal(serialized.includes('SENSITIVE_CREDENTIAL_DO_NOT_KEEP'), false);
});

test('forbidden audit records remain unapproved even if source claims approval', () => {
  const record = createSanitizedRunRecord({
    run_id: 'gd_forbidden_001',
    task_id: 'task_forbidden_001',
    status: 'forbidden_request',
    goal: 'Run a shell command',
    criteria: ['Must be blocked'],
    risk_level: 'high',
    action_class: 'shell_command',
    permission_level: 'forbidden',
    approval_decision: {
      decision: 'forbidden',
      blocked: true,
      approved: true,
      requires_human_approval: true,
      reason: 'Forbidden action rejected before task initialization.'
    }
  }, { now: '2026-05-29T00:00:00.000Z' });

  assert.equal(record.approval_decision.decision, 'forbidden');
  assert.equal(record.approval_decision.blocked, true);
  assert.equal(record.approval_decision.approved, false);
  assert.equal(record.action_class, 'shell_command');
  assert.equal(record.permission_level, 'forbidden');
});
