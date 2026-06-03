import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('local runtime health check passes in offline mode without n8n running', () => {
  const result = spawnSync(process.execPath, [
    'scripts/check-local-runtime-health.mjs',
    '--offline',
    '--json'
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);

  assert.equal(output.ok, true);
  assert.equal(output.mode, 'offline');
  assert.equal(output.compose.present, true);
  assert.equal(output.workflow_exports.ok, true);
  assert.equal(output.gitignore.ok, true);
  assert.equal(output.n8n_runtime.checked, false);
  assert.equal(output.safety.no_runtime_write_attempted, true);
});
