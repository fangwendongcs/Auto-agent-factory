import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { validatePayload } from '../src/utils/validatePayload.js';

const scriptPath = path.resolve('scripts/write-dev-audit-record.mjs');
const replayFixturePath = path.resolve('examples/audit-replay/v08f-read-only-run-record.json');

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env || {}) },
    encoding: 'utf8'
  });
}

test('v0.8f staging replay fixture is a valid sanitized audit record', () => {
  const fixture = JSON.parse(fs.readFileSync(replayFixturePath, 'utf8'));
  const result = validatePayload('auditRecord', fixture);

  assert.equal(result.valid, true, result.errors.join('; '));
  assert.equal(fixture.safety.raw_prompt_stored, false);
  assert.equal(fixture.safety.raw_provider_response_stored, false);
  assert.equal(fixture.safety.secrets_stored, false);
  assert.equal(fixture.storage.persisted, false);
});

test('v0.8f staging replay CLI default path validates but does not write', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-replay-disabled-'));
  const result = runCli([replayFixturePath], {
    cwd,
    env: {
      AUDIT_STORAGE_ENABLED: '',
      AUDIT_STORAGE_MODE: '',
      AUDIT_STORAGE_PATH: ''
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, true);
  assert.equal(output.written, false);
  assert.equal(output.reason, 'audit_storage_disabled');
  assert.equal(output.run_id, 'gd_v08f_replay_001');
  assert.equal(fs.existsSync(path.join(cwd, '.local-audit', 'v08f-replay.jsonl')), false);
});

test('v0.8f staging replay CLI explicit dev-only path writes sanitized JSONL', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-replay-enabled-'));
  const result = runCli([replayFixturePath], {
    cwd,
    env: {
      AUDIT_STORAGE_ENABLED: 'true',
      AUDIT_STORAGE_MODE: 'dev-jsonl',
      AUDIT_STORAGE_PATH: '.local-audit/v08f-replay.jsonl'
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  const outputPath = path.join(cwd, '.local-audit', 'v08f-replay.jsonl');
  assert.equal(output.written, true);
  assert.equal(output.output_path, '.local-audit/v08f-replay.jsonl');
  assert.equal(fs.existsSync(outputPath), true);

  const line = fs.readFileSync(outputPath, 'utf8').trim();
  const record = JSON.parse(line);
  const serialized = JSON.stringify(record);

  assert.equal(record.run_id, 'gd_v08f_replay_001');
  assert.equal(record.storage.mode, 'dev_jsonl');
  assert.equal(record.storage.persisted, true);
  assert.equal(serialized.includes('Authorization'), false);
  assert.equal(serialized.includes('Bearer'), false);
  assert.equal(Object.hasOwn(record, 'provider_response_raw'), false);
  assert.equal(Object.hasOwn(record, 'provider_request'), false);
  assert.equal(serialized.includes('raw full response'), false);
});
