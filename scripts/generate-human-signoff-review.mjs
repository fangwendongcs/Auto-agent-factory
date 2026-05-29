#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  generateHumanSignoffReview,
  writeHumanSignoffReviewArtifact
} from '../src/utils/generateHumanSignoffReview.js';
import { validateAuditRecordForStorage } from '../src/utils/auditStorage.js';

function printError(value) {
  process.stderr.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  return {
    usage: 'node scripts/generate-human-signoff-review.mjs <sanitized-audit-record.json | dev-audit-log.jsonl>',
    output: 'Markdown sign-off review package to stdout',
    safety: [
      'reads sanitized audit records only',
      'does not connect to n8n runtime',
      'does not call providers',
      'does not auto-approve runs',
      'does not write files by default',
      'writes only to .local-audit/signoff/*.md when HUMAN_SIGNOFF_WRITE_ENABLED=true'
    ]
  };
}

function readInput(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (filePath.endsWith('.jsonl')) {
    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
  return JSON.parse(raw);
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
  const records = readInput(absoluteInputPath);
  const list = Array.isArray(records) ? records : [records];

  const errors = [];
  list.forEach((record, index) => {
    const result = validateAuditRecordForStorage(record);
    if (!result.valid) {
      errors.push({ index, errors: result.errors });
    }
  });

  if (errors.length > 0) {
    printError({
      ok: false,
      reason: 'human_signoff_input_validation_failed',
      errors
    });
    process.exit(1);
  }

  const review = generateHumanSignoffReview(list);
  const writeResult = writeHumanSignoffReviewArtifact(review, {
    env: process.env,
    cwd: process.cwd()
  });

  process.stdout.write(`${review}\n`);

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
    reason: 'human_signoff_generation_failed',
    error: error.message
  });
  process.exit(1);
}
