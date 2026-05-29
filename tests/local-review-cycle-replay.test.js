import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const scriptPath = path.resolve('scripts/replay-local-review-cycle.mjs');
const auditRecordPath = path.resolve('examples/audit-replay/v08f-read-only-run-record.json');
const decisionInputPath = path.resolve('examples/signoff-decisions/sample_readonly_needs_review_decision.json');

function runReplay(options = {}) {
  return spawnSync(process.execPath, [scriptPath, auditRecordPath, decisionInputPath], {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env || {}) },
    encoding: 'utf8'
  });
}

test('local review cycle replay generates report, signoff review, ledger append, and summary', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'review-cycle-replay-'));
  const result = runReplay({
    cwd,
    env: {
      V012_REPLAY_ID: 'test_replay_001'
    }
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^# Human Sign-off Decision Ledger Summary/m);
  assert.match(result.stdout, /Total records: 1/);
  assert.match(result.stdout, /Needs review: 1/);

  const status = JSON.parse(result.stderr);
  assert.equal(status.ok, true);
  assert.equal(status.replay_id, 'test_replay_001');
  assert.equal(status.decision, 'needs_review');

  const auditReportPath = path.join(cwd, '.local-audit', 'reports', 'v012-test_replay_001-audit-report.md');
  const signoffReviewPath = path.join(cwd, '.local-audit', 'signoff', 'v012-test_replay_001-signoff-review.md');
  const ledgerPath = path.join(cwd, '.local-audit', 'signoff-ledger', 'v012-test_replay_001-ledger.jsonl');

  assert.equal(fs.existsSync(auditReportPath), true);
  assert.equal(fs.existsSync(signoffReviewPath), true);
  assert.equal(fs.existsSync(ledgerPath), true);
  assert.match(fs.readFileSync(auditReportPath, 'utf8'), /^# Audit Review Report/m);
  assert.match(fs.readFileSync(signoffReviewPath, 'utf8'), /^# Human Sign-off Review Package/m);

  const ledgerLines = fs.readFileSync(ledgerPath, 'utf8').trim().split('\n');
  assert.equal(ledgerLines.length, 1);
  assert.equal(JSON.parse(ledgerLines[0]).decision, 'needs_review');
});

test('local review cycle replay output does not include secret-like or raw payload field names', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'review-cycle-safe-'));
  const result = runReplay({
    cwd,
    env: {
      V012_REPLAY_ID: 'test_replay_safe'
    }
  });
  const combined = `${result.stdout}\n${result.stderr}`;

  assert.equal(result.status, 0, result.stderr);
  assert.equal(combined.includes(`${'Author'}ization`), false);
  assert.equal(combined.includes(`${'Bear'}er`), false);
  assert.equal(combined.includes(`${'sk'}-`), false);
  assert.equal(combined.includes(['provider', 'response', 'raw'].join('_')), false);
  assert.equal(combined.includes(['full', 'prompt'].join('_')), false);
});
