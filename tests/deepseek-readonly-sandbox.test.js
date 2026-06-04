import assert from 'node:assert/strict';
import http from 'node:http';
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
  assert.equal(output.payload.provider_mode, 'provider');
  assert.equal(output.payload.requested_provider_mode, 'provider');
  assert.equal(output.payload.agent_mode, 'provider');
  assert.equal(output.payload.provider_max_tokens, 4000);
  assert.equal(output.payload.context.provider_mode, 'provider');
  assert.equal(output.payload.context.agent_mode, 'provider');
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

test('DeepSeek read-only sandbox treats empty n8n response summary as failure', async (t) => {
  const server = http.createServer((request, response) => {
    request.resume();
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end('{}');
  });

  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
  } catch (error) {
    if (error && error.code === 'EPERM') {
      t.skip('local TCP listen is blocked in this sandbox');
      return;
    }
    throw error;
  }

  const { port } = server.address();

  try {
    const result = spawnSync(process.execPath, [scriptPath], {
      env: {
        ...process.env,
        DEEPSEEK_SANDBOX_SEND_ENABLED: 'true',
        DEEPSEEK_SANDBOX_WRITE_SUMMARY: '',
        N8N_TEST_WEBHOOK_URL: `http://127.0.0.1:${port}/webhook/test`
      },
      encoding: 'utf8'
    });

    assert.notEqual(result.status, 0);
    const output = JSON.parse(result.stdout);
    assert.equal(output.ok, false);
    assert.equal(output.error.class, 'empty_response');
    assert.notEqual(output.error.message, null);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
