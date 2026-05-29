import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { validatePayload } from '../src/utils/validatePayload.js';
import {
  appendSignoffDecision,
  createSignoffDecisionRecord,
  generateSignoffLedgerSummary,
  generateSignoffLedgerSummaryReport,
  readSignoffLedgerJsonl,
  validateSignoffDecisionRecord
} from '../src/utils/signoffDecisionLedger.js';

const writeScriptPath = path.resolve('scripts/write-human-signoff-decision.mjs');
const ledgerScriptPath = path.resolve('scripts/generate-signoff-ledger-report.mjs');
const auditRecordPath = path.resolve('examples/audit-replay/v08f-read-only-run-record.json');
const decisionInputPath = path.resolve('examples/signoff-decisions/sample_readonly_needs_review_decision.json');
const approvedDecisionPath = path.resolve('examples/signoff-decisions/sample_readonly_approved_decision_record.json');
const ledgerFixturePath = path.resolve('examples/signoff-decisions/sample_signoff_decision_ledger.jsonl');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function runNode(scriptPath, args, options = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env || {}) },
    encoding: 'utf8'
  });
}

test('sample sign-off decision matches schema and validator', () => {
  const record = readJson(approvedDecisionPath);
  const schema = validatePayload('signoffDecision', record);
  const validation = validateSignoffDecisionRecord(record);

  assert.equal(schema.valid, true, schema.errors.join('; '));
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('creates sanitized sign-off decision from sanitized audit record and explicit human input', () => {
  const auditRecord = readJson(auditRecordPath);
  const decisionInput = readJson(decisionInputPath);
  const decision = createSignoffDecisionRecord(auditRecord, decisionInput, {
    now: '2026-05-29T00:00:00.000Z'
  });
  const validation = validateSignoffDecisionRecord(decision);
  const serialized = JSON.stringify(decision);

  assert.equal(validation.valid, true, validation.errors.join('; '));
  assert.equal(decision.record_type, 'human_signoff_decision');
  assert.equal(decision.decision, 'needs_review');
  assert.equal(decision.safety.no_auto_approval, true);
  assert.equal(decision.safety.side_effects_enabled, false);
  assert.equal(serialized.includes('provider_payload_fields'), true);
  assert.equal(serialized.includes('SENSITIVE'), false);
});

test('default sign-off ledger append is disabled and writes nothing', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'signoff-ledger-disabled-'));
  const record = readJson(approvedDecisionPath);
  const result = appendSignoffDecision(record, { cwd, env: {} });
  const ledgerPath = path.join(cwd, '.local-audit', 'signoff-ledger', 'dev-signoff-ledger.jsonl');

  assert.equal(result.written, false);
  assert.equal(result.reason, 'signoff_ledger_disabled');
  assert.equal(fs.existsSync(ledgerPath), false);
});

test('explicit dev-only sign-off ledger append writes under .local-audit/signoff-ledger', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'signoff-ledger-enabled-'));
  const record = readJson(approvedDecisionPath);
  const env = {
    SIGNOFF_LEDGER_WRITE_ENABLED: 'true',
    SIGNOFF_LEDGER_MODE: 'dev-jsonl',
    SIGNOFF_LEDGER_PATH: '.local-audit/signoff-ledger/test-ledger.jsonl'
  };

  const result = appendSignoffDecision(record, { cwd, env });
  const records = readSignoffLedgerJsonl(path.join(cwd, '.local-audit', 'signoff-ledger', 'test-ledger.jsonl'));

  assert.equal(result.written, true);
  assert.equal(records.length, 1);
  assert.equal(records[0].storage.mode, 'dev_signoff_jsonl');
  assert.equal(records[0].storage.persisted, true);
});

test('sign-off ledger rejects paths outside .local-audit/signoff-ledger and non-jsonl paths', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'signoff-ledger-bad-path-'));
  const record = readJson(approvedDecisionPath);

  assert.throws(
    () => appendSignoffDecision(record, {
      cwd,
      env: {
        SIGNOFF_LEDGER_WRITE_ENABLED: 'true',
        SIGNOFF_LEDGER_MODE: 'dev-jsonl',
        SIGNOFF_LEDGER_PATH: 'docs/signoff.jsonl'
      }
    }),
    /must stay under \.local-audit\/signoff-ledger\//
  );

  assert.throws(
    () => appendSignoffDecision(record, {
      cwd,
      env: {
        SIGNOFF_LEDGER_WRITE_ENABLED: 'true',
        SIGNOFF_LEDGER_MODE: 'dev-jsonl',
        SIGNOFF_LEDGER_PATH: '.local-audit/signoff-ledger/signoff.txt'
      }
    }),
    /must be a \.jsonl file/
  );
});

test('forbidden or unsafe decisions cannot be recorded as approved', () => {
  const forbiddenApproved = {
    ...readJson(approvedDecisionPath),
    decision: 'approved',
    risk_snapshot: {
      risk_level: 'high',
      action_class: 'shell_command',
      permission_level: 'forbidden',
      safe_for_review: true,
      forbidden_action: true,
      write_like_action: true,
      high_risk: true
    },
    reason_summary: 'Forbidden action should never be approved by the local decision ledger.'
  };
  const unsafeApproved = {
    ...readJson(approvedDecisionPath),
    decision: 'approved',
    risk_snapshot: {
      ...readJson(approvedDecisionPath).risk_snapshot,
      safe_for_review: false
    },
    redaction: {
      applied: false,
      excluded_fields: []
    }
  };

  assert.equal(validateSignoffDecisionRecord(forbiddenApproved).valid, false);
  assert.equal(validateSignoffDecisionRecord(unsafeApproved).valid, false);
});

test('high-risk or write-like decisions require an explicit reason summary', () => {
  const record = {
    ...readJson(approvedDecisionPath),
    decision: 'needs_review',
    reason_summary: 'short',
    risk_snapshot: {
      risk_level: 'high',
      action_class: 'repo_write',
      permission_level: 'write_action',
      safe_for_review: true,
      forbidden_action: false,
      write_like_action: true,
      high_risk: true
    }
  };

  const validation = validateSignoffDecisionRecord(record);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes('explicit reason')));
});

test('sign-off decision validator rejects denied fields and secret-like values', () => {
  const unsafeRecord = {
    ...readJson(approvedDecisionPath),
    [['provider', 'request'].join('_')]: { chat_payload: 'do not store' },
    notes_summary: ['Bear' + 'er', 'fake-secret-like-value'].join(' ')
  };

  const validation = validateSignoffDecisionRecord(unsafeRecord);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes('denied field')));
  assert.ok(validation.errors.some((error) => error.includes('secret-like value')));
});

test('write decision CLI outputs sanitized decision by default and writes nothing', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'signoff-cli-default-'));
  const result = runNode(writeScriptPath, [auditRecordPath, decisionInputPath], { cwd });
  const ledgerPath = path.join(cwd, '.local-audit', 'signoff-ledger', 'dev-signoff-ledger.jsonl');
  const output = JSON.parse(result.stdout);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(output.record_type, 'human_signoff_decision');
  assert.equal(output.decision, 'needs_review');
  assert.equal(fs.existsSync(ledgerPath), false);
});

test('write decision CLI explicitly writes dev-only ledger JSONL', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'signoff-cli-enabled-'));
  const result = runNode(writeScriptPath, [auditRecordPath, decisionInputPath], {
    cwd,
    env: {
      SIGNOFF_LEDGER_WRITE_ENABLED: 'true',
      SIGNOFF_LEDGER_MODE: 'dev-jsonl',
      SIGNOFF_LEDGER_PATH: '.local-audit/signoff-ledger/cli-ledger.jsonl'
    }
  });
  const ledgerPath = path.join(cwd, '.local-audit', 'signoff-ledger', 'cli-ledger.jsonl');
  const records = readJsonl(ledgerPath);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(records.length, 1);
  assert.equal(records[0].storage.mode, 'dev_signoff_jsonl');
  assert.match(result.stderr, /"written": true/);
});

test('ledger summary report renders review status from JSONL fixture', () => {
  const records = readJsonl(ledgerFixturePath);
  const summary = generateSignoffLedgerSummary(records);
  const report = generateSignoffLedgerSummaryReport(records);

  assert.equal(summary.total_records, 2);
  assert.equal(summary.approved, 1);
  assert.equal(summary.needs_review, 1);
  assert.equal(summary.review_status, 'manual_review_required');
  assert.match(report, /^# Human Sign-off Decision Ledger Summary/m);
  assert.match(report, /Review status: manual_review_required/);
});

test('ledger summary CLI reads sanitized decision JSONL fixture', () => {
  const result = runNode(ledgerScriptPath, [ledgerFixturePath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Total records: 2/);
  assert.match(result.stdout, /Approved: 1/);
  assert.match(result.stdout, /Needs review: 1/);
  assert.match(result.stdout, /Review status: manual_review_required/);
});
