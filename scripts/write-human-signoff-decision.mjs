#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  appendSignoffDecision,
  createSignoffDecisionRecord,
  validateSignoffDecisionRecord
} from '../src/utils/signoffDecisionLedger.js';

function printError(value) {
  process.stderr.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  return {
    usage: 'node scripts/write-human-signoff-decision.mjs <sanitized-audit-record.json> <decision-input.json>',
    output: 'Sanitized sign-off decision JSON to stdout; optional dev-only ledger write',
    safety: [
      'reads sanitized audit records only',
      'does not auto-approve runs',
      'does not connect to n8n runtime',
      'does not write files by default',
      'writes only to .local-audit/signoff-ledger/*.jsonl when SIGNOFF_LEDGER_WRITE_ENABLED=true'
    ]
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const auditRecordPath = process.argv[2];
const decisionInputPath = process.argv[3];

if (!auditRecordPath || !decisionInputPath || auditRecordPath === '--help' || auditRecordPath === '-h') {
  if (auditRecordPath === '--help' || auditRecordPath === '-h') {
    process.stdout.write(`${JSON.stringify(usage(), null, 2)}\n`);
    process.exit(0);
  }
  printError(usage());
  process.exit(1);
}

try {
  const auditRecord = readJson(path.resolve(process.cwd(), auditRecordPath));
  const decisionInput = readJson(path.resolve(process.cwd(), decisionInputPath));
  const decisionRecord = createSignoffDecisionRecord(auditRecord, decisionInput);
  const validation = validateSignoffDecisionRecord(decisionRecord);

  if (!validation.valid) {
    printError({
      ok: false,
      reason: 'signoff_decision_validation_failed',
      errors: validation.errors
    });
    process.exit(1);
  }

  const writeResult = appendSignoffDecision(decisionRecord, {
    env: process.env,
    cwd: process.cwd()
  });

  process.stdout.write(`${JSON.stringify(decisionRecord, null, 2)}\n`);

  if (writeResult.written) {
    process.stderr.write(`${JSON.stringify({
      ok: true,
      written: true,
      path: writeResult.path,
      bytes: writeResult.bytes
    }, null, 2)}\n`);
  }
} catch (error) {
  printError({
    ok: false,
    reason: 'signoff_decision_write_failed',
    error: error.message
  });
  process.exit(1);
}
