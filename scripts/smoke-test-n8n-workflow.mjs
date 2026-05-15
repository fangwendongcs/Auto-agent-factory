#!/usr/bin/env node

import process from 'node:process';

const payload = {
  projectName: 'digital-human-companion',
  goal: 'Add a safe animation-state refactor plan',
  mode: 'prepare_codex_task',
  constraints: [
    'Do not remove existing animations',
    'Do not expose API keys',
    'Keep changes reviewable'
  ],
  acceptanceCriteria: [
    'A clear Codex task prompt is generated',
    'Risk level is not high',
    'Rollback plan is included'
  ]
};

const webhookUrl = process.env.N8N_TEST_WEBHOOK_URL || '';

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function printCurlCommand(url) {
  const target = url || '$N8N_TEST_WEBHOOK_URL';
  const body = JSON.stringify(payload);
  console.log('Manual curl command:');
  console.log(
    `curl -X POST ${shellQuote(target)} -H 'Content-Type: application/json' -d ${shellQuote(body)}`
  );
}

async function main() {
  console.log('Smoke-test payload:');
  console.log(JSON.stringify(payload, null, 2));
  printCurlCommand(webhookUrl);

  if (!webhookUrl) {
    console.log('N8N_TEST_WEBHOOK_URL is not set. Skipping network request.');
    return;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
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

