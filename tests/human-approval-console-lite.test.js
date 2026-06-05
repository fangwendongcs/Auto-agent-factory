import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  createHumanApprovalConsoleDecision,
  normalizeHumanApprovalReviewItem,
  renderHumanApprovalConsole,
  validateHumanApprovalConsoleInput
} from '../src/utils/humanApprovalConsoleLite.js';
import { readSignoffLedgerJsonl } from '../src/utils/signoffDecisionLedger.js';

const scriptPath = path.resolve('scripts/run-human-approval-console-lite.mjs');
const reviewInputPath = path.resolve('examples/approval-console/sample_recovery_provider_5xx_review.json');
const decisionInputPath = path.resolve('examples/approval-console/sample_needs_review_decision.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function runNode(args, options = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env || {}) },
    encoding: 'utf8'
  });
}

test('Human Approval Console Lite normalizes recovery policy into a local review item', () => {
  const reviewInput = readJson(reviewInputPath);
  const reviewItem = normalizeHumanApprovalReviewItem(reviewInput, {
    now: '2026-06-04T00:00:00.000Z'
  });
  const markdown = renderHumanApprovalConsole(reviewItem);

  assert.equal(reviewItem.console_version, 'v0.18-human-approval-console-lite');
  assert.equal(reviewItem.source_type, 'recovery_policy');
  assert.equal(reviewItem.run_id, 'gd_v018_recovery_5xx_001');
  assert.equal(reviewItem.audit_record.risk_level, 'medium');
  assert.equal(reviewItem.audit_record.action_class, 'read_only');
  assert.equal(reviewItem.audit_record.approval_decision.requires_human_approval, true);
  assert.equal(reviewItem.safety.automatic_execution_enabled, false);
  assert.equal(reviewItem.safety.no_auto_retry, true);
  assert.match(markdown, /Automatic retry: no/);
  assert.match(markdown, /Workflow runtime modified: no/);
});

test('Human Approval Console Lite creates a sanitized decision record without enabling execution', () => {
  const reviewInput = readJson(reviewInputPath);
  const decisionInput = readJson(decisionInputPath);
  const { decision_record: decisionRecord } = createHumanApprovalConsoleDecision(
    reviewInput,
    decisionInput,
    { now: '2026-06-04T00:00:00.000Z' }
  );

  assert.equal(decisionRecord.record_type, 'human_signoff_decision');
  assert.equal(decisionRecord.decision, 'needs_review');
  assert.equal(decisionRecord.safety.no_auto_approval, true);
  assert.equal(decisionRecord.safety.side_effects_enabled, false);
  assert.equal(decisionRecord.safety.secrets_stored, false);
  assert.equal(decisionRecord.risk_snapshot.action_class, 'read_only');
});

test('Human Approval Console Lite CLI prints review package and writes nothing by default', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'approval-console-default-'));
  const result = runNode([reviewInputPath, decisionInputPath], { cwd });
  const ledgerPath = path.join(cwd, '.local-audit', 'signoff-ledger', 'dev-signoff-ledger.jsonl');

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /# Human Approval Console Lite/);
  assert.match(result.stdout, /Decision: needs_review/);
  assert.match(result.stdout, /Written: no/);
  assert.equal(fs.existsSync(ledgerPath), false);
});

test('Human Approval Console Lite CLI writes only to explicit dev-only ledger path', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'approval-console-ledger-'));
  const result = runNode([reviewInputPath, decisionInputPath], {
    cwd,
    env: {
      SIGNOFF_LEDGER_WRITE_ENABLED: 'true',
      SIGNOFF_LEDGER_MODE: 'dev-jsonl',
      SIGNOFF_LEDGER_PATH: '.local-audit/signoff-ledger/v018-console-ledger.jsonl'
    }
  });
  const ledgerPath = path.join(cwd, '.local-audit', 'signoff-ledger', 'v018-console-ledger.jsonl');
  const records = readSignoffLedgerJsonl(ledgerPath);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(records.length, 1);
  assert.equal(records[0].decision, 'needs_review');
  assert.equal(records[0].storage.mode, 'dev_signoff_jsonl');
  assert.match(result.stderr, /"written": true/);
});

test('Human Approval Console Lite refuses raw or secret-like input', () => {
  const unsafeInput = {
    ...readJson(reviewInputPath),
    provider_response_raw: {
      text: 'raw provider output should not enter the console'
    }
  };
  const secretInput = {
    ...readJson(reviewInputPath),
    notes: ['Bear' + 'er', 'fake-secret-like-value'].join(' ')
  };

  assert.equal(validateHumanApprovalConsoleInput(unsafeInput).valid, false);
  assert.equal(validateHumanApprovalConsoleInput(secretInput).valid, false);
});
