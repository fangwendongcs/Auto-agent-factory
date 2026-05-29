#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  generateAuditReviewReport,
  writeAuditReviewReportArtifact
} from '../src/utils/generateAuditReviewReport.js';
import { validateAuditRecordForStorage } from '../src/utils/auditStorage.js';

function printError(value) {
  process.stderr.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  return {
    usage: 'node scripts/generate-audit-review-report.mjs <sanitized-audit-record.json | dev-audit-log.jsonl>',
    output: 'Markdown report to stdout',
    safety: [
      'reads sanitized audit records only',
      'does not read unredacted provider payloads',
      'does not read prompt or provider chat payloads',
      'does not connect to n8n runtime',
      'does not write report files by default',
      'writes only to .local-audit/reports/*.md when AUDIT_REPORT_WRITE_ENABLED=true'
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
      reason: 'audit_report_input_validation_failed',
      errors
    });
    process.exit(1);
  }

  const report = generateAuditReviewReport(list);
  const writeResult = writeAuditReviewReportArtifact(report, {
    env: process.env,
    cwd: process.cwd()
  });

  process.stdout.write(`${report}\n`);

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
    reason: 'audit_report_generation_failed',
    error: error.message
  });
  process.exit(1);
}
