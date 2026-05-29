import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { generateAuditReviewReport, evaluateAuditRecordForReview } from '../src/utils/generateAuditReviewReport.js';

const scriptPath = path.resolve('scripts/generate-audit-review-report.mjs');
const sampleRecordPath = path.resolve('examples/sample_sanitized_run_record.json');
const replayRecordPath = path.resolve('examples/audit-replay/v08f-read-only-run-record.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env || {}) },
    encoding: 'utf8'
  });
}

test('audit review report renders a sanitized single-record markdown report', () => {
  const record = readJson(replayRecordPath);
  const report = generateAuditReviewReport(record);

  assert.match(report, /^# Audit Review Report/m);
  assert.match(report, /Run_id|run_id/i);
  assert.match(report, /gd_v08f_replay_001/);
  assert.match(report, /Action class: read_only/);
  assert.match(report, /Permission level: read_only/);
  assert.match(report, /Approval decision: allow/);
  assert.match(report, /Provider mode: mock/);
  assert.match(report, /Safe for review: yes/);
});

test('audit review report highlights forbidden and high-risk records', () => {
  const record = {
    ...readJson(sampleRecordPath),
    run_id: 'gd_report_forbidden_001',
    task_id: 'task_report_forbidden_001',
    status: 'forbidden_request',
    risk_level: 'high',
    action_class: 'shell_command',
    permission_level: 'forbidden',
    approval_decision: {
      decision: 'forbidden',
      blocked: true,
      approved: false,
      requires_human_approval: true,
      reason_summary: 'Forbidden action rejected before task initialization.'
    }
  };
  const evaluation = evaluateAuditRecordForReview(record);
  const report = generateAuditReviewReport(record);

  assert.equal(evaluation.forbidden_action, true);
  assert.equal(evaluation.high_risk, true);
  assert.equal(evaluation.write_like_action, true);
  assert.equal(evaluation.review_flags.requires_attention, true);
  assert.match(report, /Forbidden action: yes/);
  assert.match(report, /High risk: yes/);
  assert.match(report, /Write-like action: yes/);
});

test('audit review report does not include raw prompt, raw provider response, or secret-like values', () => {
  const record = readJson(replayRecordPath);
  const report = generateAuditReviewReport(record);

  assert.equal(report.includes('provider_response_raw'), false);
  assert.equal(report.includes('provider_request'), false);
  assert.equal(report.includes('Authorization'), false);
  assert.equal(report.includes('Bearer'), false);
  assert.equal(report.includes('sk-'), false);
});

test('audit review CLI reads a single JSON record and writes markdown to stdout', () => {
  const result = runCli([replayRecordPath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^# Audit Review Report/m);
  assert.match(result.stdout, /gd_v08f_replay_001/);
  assert.match(result.stdout, /Safe for review: yes/);
});

test('audit review CLI reads JSONL with multiple sanitized records', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-report-jsonl-'));
  const first = readJson(replayRecordPath);
  const second = {
    ...first,
    run_id: 'gd_v09_report_002',
    task_id: 'task_v09_report_002',
    status: 'needs_human_approval',
    risk_level: 'high',
    action_class: 'repo_write',
    permission_level: 'write_action',
    approval_decision: {
      decision: 'needs_human_approval',
      blocked: true,
      approved: false,
      requires_human_approval: true,
      reason_summary: 'High-risk write-like action requires review.'
    }
  };
  const jsonlPath = path.join(cwd, 'records.jsonl');
  fs.writeFileSync(jsonlPath, `${JSON.stringify(first)}\n${JSON.stringify(second)}\n`);

  const result = runCli([jsonlPath], { cwd });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Total records: 2/);
  assert.match(result.stdout, /High-risk records: 1/);
  assert.match(result.stdout, /Write-like action records: 1/);
  assert.match(result.stdout, /gd_v09_report_002/);
});
