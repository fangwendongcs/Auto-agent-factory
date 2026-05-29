#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { appendAuditRecord, validateAuditRecordForStorage } from '../src/utils/auditStorage.js';

function printJson(value, stream = process.stdout) {
  stream.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  return {
    usage: 'node scripts/write-dev-audit-record.mjs <sanitized-audit-record.json>',
    default_behavior: 'Validates the sanitized audit record but does not write unless AUDIT_STORAGE_ENABLED=true.',
    dev_only_enablement: {
      AUDIT_STORAGE_ENABLED: 'true',
      AUDIT_STORAGE_MODE: 'dev-jsonl',
      AUDIT_STORAGE_PATH: '.local-audit/dev-audit-log.jsonl'
    },
    safety: [
      'dev-only',
      'disabled by default',
      'writes only under .local-audit/',
      'refuses denied fields and secret-like values',
      'does not connect to n8n runtime'
    ]
  };
}

const inputPath = process.argv[2];

if (!inputPath || inputPath === '--help' || inputPath === '-h') {
  printJson(usage(), inputPath ? process.stdout : process.stderr);
  process.exit(inputPath ? 0 : 1);
}

try {
  const absoluteInputPath = path.resolve(process.cwd(), inputPath);
  const raw = fs.readFileSync(absoluteInputPath, 'utf8');
  const record = JSON.parse(raw);
  const validation = validateAuditRecordForStorage(record);

  if (!validation.valid) {
    printJson({
      ok: false,
      written: false,
      reason: 'audit_record_validation_failed',
      errors: validation.errors,
      input_path: inputPath
    }, process.stderr);
    process.exit(1);
  }

  const result = appendAuditRecord(record);

  printJson({
    ok: true,
    written: result.written,
    reason: result.reason,
    output_path: result.path,
    bytes: result.bytes || 0,
    run_id: record.run_id || null,
    task_id: record.task_id || null,
    storage_mode: process.env.AUDIT_STORAGE_ENABLED === 'true'
      ? process.env.AUDIT_STORAGE_MODE || 'dev-jsonl'
      : 'disabled'
  });
} catch (error) {
  printJson({
    ok: false,
    written: false,
    reason: 'audit_cli_failed',
    error: error.message
  }, process.stderr);
  process.exit(1);
}
