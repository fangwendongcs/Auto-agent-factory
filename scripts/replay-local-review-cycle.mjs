#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  generateAuditReviewReport,
  writeAuditReviewReportArtifact
} from '../src/utils/generateAuditReviewReport.js';
import {
  generateHumanSignoffReview,
  writeHumanSignoffReviewArtifact
} from '../src/utils/generateHumanSignoffReview.js';
import {
  appendSignoffDecision,
  createSignoffDecisionRecord,
  generateSignoffLedgerSummaryReport,
  readSignoffLedgerJsonl,
  validateSignoffDecisionRecord
} from '../src/utils/signoffDecisionLedger.js';
import { validateAuditRecordForStorage } from '../src/utils/auditStorage.js';

const DEFAULT_AUDIT_RECORD_PATH = 'examples/audit-replay/v08f-read-only-run-record.json';
const DEFAULT_DECISION_INPUT_PATH = 'examples/signoff-decisions/sample_readonly_needs_review_decision.json';

function printError(value) {
  process.stderr.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  return {
    usage: 'node scripts/replay-local-review-cycle.mjs [sanitized-audit-record.json] [decision-input.json]',
    output: 'Local review cycle summary JSON to stderr and ledger summary Markdown to stdout',
    writes: [
      '.local-audit/reports/*.md',
      '.local-audit/signoff/*.md',
      '.local-audit/signoff-ledger/*.jsonl'
    ],
    safety: [
      'repo-side local replay only',
      'uses sanitized sample inputs',
      'does not connect to n8n runtime',
      'does not call providers',
      'does not auto-approve runs',
      'does not write outside .local-audit/'
    ]
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function safeReplayId(value) {
  return String(value || new Date().toISOString())
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 40) || 'local_replay';
}

if (process.argv[2] === '--help' || process.argv[2] === '-h') {
  process.stdout.write(`${JSON.stringify(usage(), null, 2)}\n`);
  process.exit(0);
}

try {
  const auditRecordPath = path.resolve(process.cwd(), process.argv[2] || DEFAULT_AUDIT_RECORD_PATH);
  const decisionInputPath = path.resolve(process.cwd(), process.argv[3] || DEFAULT_DECISION_INPUT_PATH);
  const replayId = safeReplayId(process.env.V012_REPLAY_ID || new Date().toISOString());

  const auditRecord = readJson(auditRecordPath);
  const decisionInput = readJson(decisionInputPath);

  const auditValidation = validateAuditRecordForStorage(auditRecord);
  if (!auditValidation.valid) {
    printError({
      ok: false,
      reason: 'review_cycle_audit_record_validation_failed',
      errors: auditValidation.errors
    });
    process.exit(1);
  }

  const auditReport = generateAuditReviewReport(auditRecord);
  const auditReportWrite = writeAuditReviewReportArtifact(auditReport, {
    cwd: process.cwd(),
    env: {
      AUDIT_REPORT_WRITE_ENABLED: 'true',
      AUDIT_REPORT_OUTPUT_PATH: `.local-audit/reports/v012-${replayId}-audit-report.md`
    }
  });

  const signoffReview = generateHumanSignoffReview(auditRecord);
  const signoffReviewWrite = writeHumanSignoffReviewArtifact(signoffReview, {
    cwd: process.cwd(),
    env: {
      HUMAN_SIGNOFF_WRITE_ENABLED: 'true',
      HUMAN_SIGNOFF_OUTPUT_PATH: `.local-audit/signoff/v012-${replayId}-signoff-review.md`
    }
  });

  const decisionRecord = createSignoffDecisionRecord(auditRecord, decisionInput, {
    now: decisionInput.created_at || '2026-05-29T00:00:00.000Z'
  });
  const decisionValidation = validateSignoffDecisionRecord(decisionRecord);
  if (!decisionValidation.valid) {
    printError({
      ok: false,
      reason: 'review_cycle_decision_validation_failed',
      errors: decisionValidation.errors
    });
    process.exit(1);
  }

  const ledgerPath = `.local-audit/signoff-ledger/v012-${replayId}-ledger.jsonl`;
  const ledgerWrite = appendSignoffDecision(decisionRecord, {
    cwd: process.cwd(),
    env: {
      SIGNOFF_LEDGER_WRITE_ENABLED: 'true',
      SIGNOFF_LEDGER_MODE: 'dev-jsonl',
      SIGNOFF_LEDGER_PATH: ledgerPath
    }
  });

  const ledgerRecords = readSignoffLedgerJsonl(path.resolve(process.cwd(), ledgerPath));
  const ledgerSummary = generateSignoffLedgerSummaryReport(ledgerRecords);

  process.stderr.write(`${JSON.stringify({
    ok: true,
    replay_id: replayId,
    steps: [
      'sample audit record validated',
      'audit report generated',
      'signoff review generated',
      'signoff decision sanitized',
      'decision ledger appended',
      'ledger summary generated'
    ],
    artifacts: {
      audit_report: auditReportWrite.path,
      signoff_review: signoffReviewWrite.path,
      signoff_ledger: ledgerWrite.path
    },
    decision: decisionRecord.decision,
    run_id: decisionRecord.run_id,
    task_id: decisionRecord.task_id
  }, null, 2)}\n`);

  process.stdout.write(`${ledgerSummary}\n`);
} catch (error) {
  printError({
    ok: false,
    reason: 'local_review_cycle_replay_failed',
    error: error.message
  });
  process.exit(1);
}
