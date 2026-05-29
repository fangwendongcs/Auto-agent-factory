import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { appendAuditRecord, readAuditJsonl, validateAuditRecordForStorage } from '../src/utils/auditStorage.js';
import { createSanitizedRunRecord } from '../src/utils/sanitizeAuditRecord.js';

function makeRecord(overrides = {}) {
  return createSanitizedRunRecord({
    run_id: 'gd_storage_001',
    task_id: 'task_storage_001',
    status: 'needs_review',
    goal: 'Generate a sanitized audit storage test record',
    criteria: ['Must stay sanitized'],
    risk_level: 'low',
    action_class: 'read_only',
    permission_level: 'read_only',
    provider_call_status: 'response_received',
    approval_decision: {
      decision: 'allow',
      blocked: false,
      approved: false,
      requires_human_approval: false,
      reason: 'Read-only audit storage test.'
    },
    ...overrides
  }, { now: '2026-05-29T00:00:00.000Z' });
}

test('audit storage is disabled by default and writes nothing', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-disabled-'));
  const result = appendAuditRecord(makeRecord(), { cwd, env: {} });

  assert.equal(result.written, false);
  assert.equal(result.reason, 'audit_storage_disabled');
  assert.equal(fs.existsSync(path.join(cwd, '.local-audit', 'dev-audit-log.jsonl')), false);
});

test('dev-only audit storage writes sanitized JSONL under .local-audit when explicitly enabled', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-enabled-'));
  const env = {
    AUDIT_STORAGE_ENABLED: 'true',
    AUDIT_STORAGE_MODE: 'dev-jsonl',
    AUDIT_STORAGE_PATH: '.local-audit/dev-audit-log.jsonl'
  };

  const result = appendAuditRecord(makeRecord(), { cwd, env });
  const filePath = path.join(cwd, '.local-audit', 'dev-audit-log.jsonl');
  const records = readAuditJsonl(filePath);

  assert.equal(result.written, true);
  assert.equal(result.path, '.local-audit/dev-audit-log.jsonl');
  assert.equal(records.length, 1);
  assert.equal(records[0].storage.mode, 'dev_jsonl');
  assert.equal(records[0].storage.persisted, true);
  assert.equal(records[0].safety.secrets_stored, false);
});

test('dev-only audit storage rejects paths outside .local-audit', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-bad-path-'));
  const env = {
    AUDIT_STORAGE_ENABLED: 'true',
    AUDIT_STORAGE_MODE: 'dev-jsonl',
    AUDIT_STORAGE_PATH: 'docs/audit-log.jsonl'
  };

  assert.throws(
    () => appendAuditRecord(makeRecord(), { cwd, env }),
    /must stay under \.local-audit\//
  );
});

test('dev-only audit storage refuses denied fields and secret-like values', () => {
  const unsafeRecord = {
    ...makeRecord(),
    provider_request: {
      messages: [{ role: 'user', content: 'do not store this' }]
    },
    approval_decision: {
      decision: 'allow',
      blocked: false,
      approved: false,
      requires_human_approval: false,
      reason_summary: ['Bearer', 'fake-secret-like-value'].join(' ')
    }
  };

  const validation = validateAuditRecordForStorage(unsafeRecord);

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes('denied field')));
  assert.ok(validation.errors.some((error) => error.includes('secret-like value')));
});
