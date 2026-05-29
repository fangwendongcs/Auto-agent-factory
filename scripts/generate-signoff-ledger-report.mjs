#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  generateSignoffLedgerSummaryReport,
  validateSignoffDecisionRecord
} from '../src/utils/signoffDecisionLedger.js';

function printError(value) {
  process.stderr.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  return {
    usage: 'node scripts/generate-signoff-ledger-report.mjs <signoff-decision-ledger.jsonl>',
    output: 'Markdown ledger summary to stdout',
    safety: [
      'reads sanitized sign-off decision records only',
      'does not connect to n8n runtime',
      'does not write files',
      'does not approve runs automatically'
    ]
  };
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const ledgerPath = process.argv[2];

if (!ledgerPath || ledgerPath === '--help' || ledgerPath === '-h') {
  if (ledgerPath) {
    process.stdout.write(`${JSON.stringify(usage(), null, 2)}\n`);
    process.exit(0);
  }
  printError(usage());
  process.exit(1);
}

try {
  const records = readJsonl(path.resolve(process.cwd(), ledgerPath));
  const errors = [];
  records.forEach((record, index) => {
    const validation = validateSignoffDecisionRecord(record);
    if (!validation.valid) {
      errors.push({ index, errors: validation.errors });
    }
  });

  if (errors.length > 0) {
    printError({
      ok: false,
      reason: 'signoff_ledger_validation_failed',
      errors
    });
    process.exit(1);
  }

  process.stdout.write(`${generateSignoffLedgerSummaryReport(records)}\n`);
} catch (error) {
  printError({
    ok: false,
    reason: 'signoff_ledger_report_failed',
    error: error.message
  });
  process.exit(1);
}
