import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const scriptPath = 'scripts/run-local-demo.mjs';

test('local demo script runs safe repo-side validation and replay flow', {
  skip: process.env.LOCAL_DEMO_CHILD === 'true'
    ? 'skip recursive local demo self-test inside demo:local test-suite step'
    : false
}, () => {
  const result = spawnSync(process.execPath, [scriptPath], {
    env: { ...process.env, V013_DEMO_ID: 'test_v013_demo' },
    encoding: 'utf8'
  });
  const combined = `${result.stdout}\n${result.stderr}`;

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Auto Agent Factory Local Demo/);
  assert.match(result.stdout, /Local demo step: test suite/);
  assert.match(result.stdout, /Local demo step: workflow validation/);
  assert.match(result.stdout, /Local demo step: local review cycle replay/);
  assert.match(result.stdout, /Local demo completed/);
  assert.equal(combined.includes(`${'Author'}ization`), false);
  assert.equal(combined.includes(`${'Bear'}er`), false);
  assert.equal(combined.includes(`${'sk'}-`), false);
  assert.equal(combined.includes(['provider', 'response', 'raw'].join('_')), false);
  assert.equal(combined.includes(['full', 'prompt'].join('_')), false);
});
