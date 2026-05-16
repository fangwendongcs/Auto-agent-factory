#!/usr/bin/env node

import fs from 'node:fs/promises';
import process from 'node:process';

const payloadPath = process.argv[2] || 'examples/sample_goal_request.json';
const webhookUrl = process.env.N8N_TEST_WEBHOOK_URL || '';

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

async function main() {
  const payload = JSON.parse(await fs.readFile(payloadPath, 'utf8'));
  const body = JSON.stringify(payload);
  const target = webhookUrl || '$N8N_TEST_WEBHOOK_URL';

  console.log(`Smoke-test payload source: ${payloadPath}`);
  console.log(JSON.stringify(payload, null, 2));
  console.log('Manual curl command:');
  console.log(
    `curl -X POST ${shellQuote(target)} -H 'Content-Type: application/json' -d ${shellQuote(body)}`
  );

  if (!webhookUrl) {
    console.log('N8N_TEST_WEBHOOK_URL is not set. Skipping network request.');
    return;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  });

  const responseText = await response.text();
  console.log(`HTTP status: ${response.status}`);
  console.log('Response body:');
  console.log(responseText || '<empty>');
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});

