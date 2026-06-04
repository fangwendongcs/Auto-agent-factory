import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { validatePayload } from '../src/utils/validatePayload.js';

const scriptPath = 'scripts/generate-recovery-policy.mjs';

test('recovery policy CLI emits valid retry policy JSON', () => {
  const result = spawnSync(process.execPath, [
    scriptPath,
    'examples/recovery/sample_provider_timeout.json'
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  const policy = JSON.parse(result.stdout);

  assert.equal(policy.policy_version, 'v0.17-local-recovery-policy');
  assert.equal(policy.decision, 'retry');
  assert.equal(policy.next_action, 'retry_provider_readonly');
  assert.equal(policy.safety.write_actions_enabled, false);
  assert.equal(validatePayload('recoveryPolicy', policy).valid, true);
});

test('recovery policy CLI refuses secret-like input', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recovery-policy-'));
  const inputPath = path.join(tempDir, 'unsafe.json');
  fs.writeFileSync(inputPath, JSON.stringify({
    run_id: 'gd_v017_cli_secret_001',
    task_id: 'task_v017_cli_secret_001',
    provider_error: {
      class: 'provider_error',
      message: ['Bear' + 'er', 'fake-secret-like-value'].join(' ')
    }
  }), 'utf8');

  const result = spawnSync(process.execPath, [scriptPath, inputPath], {
    encoding: 'utf8'
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /secret-like content/);
});
