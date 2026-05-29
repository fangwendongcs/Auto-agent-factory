import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const scriptPath = path.resolve('scripts/write-dev-audit-record.mjs');
const sampleRecordPath = path.resolve('examples/sample_sanitized_run_record.json');

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env || {}) },
    encoding: 'utf8'
  });
}

function parseStdout(result) {
  return JSON.parse(result.stdout);
}

test('dev audit CLI is disabled by default and writes nothing', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-cli-disabled-'));
  const result = runCli([sampleRecordPath], {
    cwd,
    env: {
      AUDIT_STORAGE_ENABLED: '',
      AUDIT_STORAGE_MODE: '',
      AUDIT_STORAGE_PATH: ''
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const output = parseStdout(result);
  assert.equal(output.ok, true);
  assert.equal(output.written, false);
  assert.equal(output.reason, 'audit_storage_disabled');
  assert.equal(fs.existsSync(path.join(cwd, '.local-audit', 'dev-audit-log.jsonl')), false);
});

test('dev audit CLI writes JSONL under .local-audit only when explicitly enabled', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-cli-enabled-'));
  const result = runCli([sampleRecordPath], {
    cwd,
    env: {
      AUDIT_STORAGE_ENABLED: 'true',
      AUDIT_STORAGE_MODE: 'dev-jsonl',
      AUDIT_STORAGE_PATH: '.local-audit/cli-audit-log.jsonl'
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const output = parseStdout(result);
  const outputPath = path.join(cwd, '.local-audit', 'cli-audit-log.jsonl');

  assert.equal(output.ok, true);
  assert.equal(output.written, true);
  assert.equal(output.output_path, '.local-audit/cli-audit-log.jsonl');
  assert.equal(fs.existsSync(outputPath), true);

  const lines = fs.readFileSync(outputPath, 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);
  const record = JSON.parse(lines[0]);
  assert.equal(record.storage.mode, 'dev_jsonl');
  assert.equal(record.storage.persisted, true);
});

test('dev audit CLI rejects paths outside .local-audit', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-cli-bad-path-'));
  const result = runCli([sampleRecordPath], {
    cwd,
    env: {
      AUDIT_STORAGE_ENABLED: 'true',
      AUDIT_STORAGE_MODE: 'dev-jsonl',
      AUDIT_STORAGE_PATH: 'docs/cli-audit-log.jsonl'
    }
  });

  assert.notEqual(result.status, 0);
  const output = JSON.parse(result.stderr);
  assert.equal(output.ok, false);
  assert.match(output.error, /must stay under \.local-audit\//);
  assert.equal(fs.existsSync(path.join(cwd, 'docs', 'cli-audit-log.jsonl')), false);
});

test('dev audit CLI rejects secret-like values', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-cli-secret-'));
  const unsafeRecord = JSON.parse(fs.readFileSync(sampleRecordPath, 'utf8'));
  unsafeRecord.approval_decision.reason_summary = ['Bearer', 'fake-secret-like-value'].join(' ');
  const unsafePath = path.join(cwd, 'unsafe-audit-record.json');
  fs.writeFileSync(unsafePath, JSON.stringify(unsafeRecord, null, 2));

  const result = runCli([unsafePath], {
    cwd,
    env: {
      AUDIT_STORAGE_ENABLED: 'true',
      AUDIT_STORAGE_MODE: 'dev-jsonl',
      AUDIT_STORAGE_PATH: '.local-audit/cli-audit-log.jsonl'
    }
  });

  assert.notEqual(result.status, 0);
  const output = JSON.parse(result.stderr);
  assert.equal(output.ok, false);
  assert.equal(output.reason, 'audit_record_validation_failed');
  assert.ok(output.errors.some((error) => error.includes('secret-like value')));
  assert.equal(fs.existsSync(path.join(cwd, '.local-audit', 'cli-audit-log.jsonl')), false);
});
