import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const scriptPath = 'scripts/run-deepseek-readonly-sandbox.mjs';

test('DeepSeek read-only sandbox defaults to dry-run payload generation', () => {
  const result = spawnSync(process.execPath, [scriptPath], {
    env: {
      ...process.env,
      DEEPSEEK_SANDBOX_SEND_ENABLED: '',
      DEEPSEEK_SANDBOX_WRITE_SUMMARY: ''
    },
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);

  assert.equal(output.ok, true);
  assert.equal(output.sent, false);
  assert.equal(output.payload.action_class, 'read_only');
  assert.equal(output.payload.provider_execution, 'provider');
  assert.equal(output.payload.context.expected_provider_mode, 'real-readonly');
  assert.equal(output.safety.no_api_key_in_payload, true);
  assert.equal(output.write_result.written, false);
});

test('DeepSeek read-only sandbox refuses remote webhook posts by default', () => {
  const result = spawnSync(process.execPath, [scriptPath], {
    env: {
      ...process.env,
      DEEPSEEK_SANDBOX_SEND_ENABLED: 'true',
      N8N_TEST_WEBHOOK_URL: 'https://example.com/webhook/test',
      DEEPSEEK_SANDBOX_ALLOW_REMOTE: ''
    },
    encoding: 'utf8'
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /only posts to localhost by default/);
});
