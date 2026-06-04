#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { generateRecoveryPolicy } from '../src/utils/generateRecoveryPolicy.js';
import { validatePayload } from '../src/utils/validatePayload.js';

function printError(value) {
  process.stderr.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  return {
    usage: 'node scripts/generate-recovery-policy.mjs <recovery-input.json>',
    output: 'Recovery policy JSON to stdout',
    safety: [
      'reads local sanitized error summaries only',
      'does not connect to n8n runtime',
      'does not retry automatically',
      'does not run shell commands',
      'does not modify files',
      'does not modify Git',
      'does not execute external write actions'
    ]
  };
}

const inputPath = process.argv[2];

if (!inputPath || inputPath === '--help' || inputPath === '-h') {
  if (inputPath) {
    process.stdout.write(`${JSON.stringify(usage(), null, 2)}\n`);
    process.exit(0);
  }
  printError(usage());
  process.exit(1);
}

try {
  const absoluteInputPath = path.resolve(process.cwd(), inputPath);
  const input = JSON.parse(fs.readFileSync(absoluteInputPath, 'utf8'));
  const policy = generateRecoveryPolicy(input);
  const validation = validatePayload('recoveryPolicy', policy);

  if (!validation.valid) {
    printError({
      ok: false,
      reason: 'recovery_policy_contract_validation_failed',
      errors: validation.errors
    });
    process.exit(1);
  }

  process.stdout.write(`${JSON.stringify(policy, null, 2)}\n`);
} catch (error) {
  printError({
    ok: false,
    reason: 'recovery_policy_generation_failed',
    error: error.message
  });
  process.exit(1);
}
