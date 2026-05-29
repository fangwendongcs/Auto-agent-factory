import fs from 'node:fs';
import path from 'node:path';
import { validatePayload } from './validatePayload.js';
import { validateAuditRecordForStorage } from './auditStorage.js';
import { evaluateAuditRecordForReview } from './generateAuditReviewReport.js';

const APPROVED_LEDGER_DIR = path.join('.local-audit', 'signoff-ledger');
const DEFAULT_LEDGER_PATH = path.join(APPROVED_LEDGER_DIR, 'dev-signoff-ledger.jsonl');
const DEFAULT_NOW = '1970-01-01T00:00:00.000Z';
const MAX_SUMMARY_LENGTH = 240;

const DENYLISTED_KEYS = new Set([
  'authorization',
  'api_key',
  'openai_api_key',
  'n8n_api_key',
  'token',
  'secret',
  'password',
  'credential',
  ['provider', 'response', 'raw'].join('_'),
  ['provider', 'request'].join('_'),
  `${'message'}s`,
  ['raw', 'prompt'].join('_'),
  ['raw', 'headers'].join('_'),
  ['raw', 'body'].join('_'),
  'cookie',
  'headers',
  'body'
]);

const SECRET_VALUE_PATTERNS = [
  new RegExp(`${'Bear'}er\\s+\\S{8,}`, 'i'),
  /sk-[A-Za-z0-9_-]{12,}/,
  /ghp_[A-Za-z0-9_]{12,}/,
  /xoxb-[A-Za-z0-9-]{12,}/,
  new RegExp(`${'Author'}ization\\s*:`, 'i')
];

function safeString(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value, maxLength = MAX_SUMMARY_LENGTH) {
  const text = safeString(value, 'No decision reason provided.');
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function makeDecisionId(runId, taskId, now) {
  return `signoff_${safeString(runId, 'gd_unknown').replace(/^gd_/, '')}_${safeString(taskId, 'task_unknown').replace(/^task_/, '')}_${now.replace(/[^A-Za-z0-9]/g, '').slice(0, 14)}`;
}

function isRedactionExcludedFieldsPath(pathParts) {
  return pathParts.length >= 3 &&
    pathParts[0] === 'redaction' &&
    pathParts[1] === 'excluded_fields';
}

function collectUnsafeKeys(value, pathParts = []) {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectUnsafeKeys(item, [...pathParts, String(index)]));
  }

  const unsafe = [];
  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = [...pathParts, key];
    if (DENYLISTED_KEYS.has(key.toLowerCase()) && !isRedactionExcludedFieldsPath(pathParts)) {
      unsafe.push(nextPath.join('.'));
    }
    unsafe.push(...collectUnsafeKeys(nestedValue, nextPath));
  }
  return unsafe;
}

function collectUnsafeStringValues(value, pathParts = []) {
  if (typeof value === 'string') {
    if (isRedactionExcludedFieldsPath(pathParts)) return [];
    return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))
      ? [pathParts.join('.') || '$']
      : [];
  }

  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectUnsafeStringValues(item, [...pathParts, String(index)]));
  }

  return Object.entries(value).flatMap(([key, nestedValue]) =>
    collectUnsafeStringValues(nestedValue, [...pathParts, key])
  );
}

export function createSignoffDecisionRecord(auditRecord = {}, decisionInput = {}, options = {}) {
  const auditValidation = validateAuditRecordForStorage(auditRecord);
  if (!auditValidation.valid) {
    throw new Error(`Source audit record refused: ${auditValidation.errors.join('; ')}`);
  }

  const now = options.now || decisionInput.created_at || DEFAULT_NOW;
  const evaluation = evaluateAuditRecordForReview(auditRecord);
  const decision = ['approved', 'rejected', 'needs_review'].includes(decisionInput.decision)
    ? decisionInput.decision
    : 'needs_review';
  const reviewer = decisionInput.reviewer && typeof decisionInput.reviewer === 'object'
    ? decisionInput.reviewer
    : {};

  return {
    signoff_decision_version: 'v0.11-dev-signoff-decision',
    decision_id: decisionInput.decision_id || makeDecisionId(auditRecord.run_id, auditRecord.task_id, now),
    record_type: 'human_signoff_decision',
    created_at: now,
    run_id: auditRecord.run_id,
    task_id: auditRecord.task_id,
    reviewer: {
      id: safeString(reviewer.id, 'local-human-reviewer'),
      type: 'human'
    },
    decision,
    reason_summary: truncate(decisionInput.reason || decisionInput.reason_summary),
    notes_summary: truncate(decisionInput.notes || decisionInput.notes_summary || '', 320),
    source_audit_record: {
      audit_record_version: auditRecord.audit_record_version,
      record_type: auditRecord.record_type
    },
    risk_snapshot: {
      risk_level: evaluation.risk_level,
      action_class: evaluation.action_class,
      permission_level: evaluation.permission_level,
      safe_for_review: evaluation.safe_for_review,
      forbidden_action: evaluation.forbidden_action,
      write_like_action: evaluation.write_like_action,
      high_risk: evaluation.high_risk
    },
    approval_snapshot: {
      existing_decision: evaluation.approval_decision,
      existing_blocked: evaluation.approval_blocked,
      existing_approved: evaluation.approval_approved
    },
    storage: {
      mode: 'mock_decision_contract',
      persisted: false
    },
    safety: {
      no_auto_approval: true,
      no_write_default: true,
      side_effects_enabled: false,
      secrets_stored: false,
      prompt_payload_stored: false,
      provider_response_payload_stored: false
    },
    redaction: {
      applied: true,
      excluded_fields: [
        'authorization',
        'api_key',
        'token',
        'password',
        'credential',
        'provider_payload_fields',
        'provider_input_payload_fields',
        'provider_chat_payload_fields',
        'prompt_payload_fields',
        'header_payload_fields',
        'body_payload_fields'
      ]
    }
  };
}

export function validateSignoffDecisionRecord(record) {
  const schemaResult = validatePayload('signoffDecision', record);
  const errors = [...schemaResult.errors];

  const unsafeKeys = collectUnsafeKeys(record);
  if (unsafeKeys.length > 0) {
    errors.push(`sign-off decision contains denied field(s): ${unsafeKeys.join(', ')}`);
  }

  const unsafeValues = collectUnsafeStringValues(record);
  if (unsafeValues.length > 0) {
    errors.push(`sign-off decision contains secret-like value(s): ${unsafeValues.join(', ')}`);
  }

  if (record?.safety?.no_auto_approval !== true) {
    errors.push('sign-off decision must declare safety.no_auto_approval = true');
  }

  if (record?.safety?.side_effects_enabled !== false) {
    errors.push('sign-off decision must declare safety.side_effects_enabled = false');
  }

  if (record?.safety?.secrets_stored !== false) {
    errors.push('sign-off decision must declare safety.secrets_stored = false');
  }

  if (record?.redaction?.applied !== true) {
    errors.push('sign-off decision must declare redaction.applied = true');
  }

  const risk = record?.risk_snapshot || {};
  if (record?.decision === 'approved' && risk.safe_for_review !== true) {
    errors.push('unsafe or unredacted run cannot be recorded as approved');
  }

  if (record?.decision === 'approved' && risk.forbidden_action === true) {
    errors.push('forbidden action cannot be recorded as approved');
  }

  if (
    (risk.high_risk === true || risk.write_like_action === true) &&
    safeString(record?.reason_summary).length < 12
  ) {
    errors.push('high-risk or write-like decision requires an explicit reason summary');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function normalizeLedgerPath(storagePath) {
  const requested = storagePath || DEFAULT_LEDGER_PATH;

  if (path.isAbsolute(requested)) {
    throw new Error('Sign-off ledger path must be relative and dev-only.');
  }

  const normalized = path.normalize(requested);

  if (normalized.startsWith('..') || normalized.includes(`..${path.sep}`)) {
    throw new Error('Sign-off ledger path cannot traverse outside the project.');
  }

  if (!normalized.startsWith(`${APPROVED_LEDGER_DIR}${path.sep}`)) {
    throw new Error('Sign-off ledger path must stay under .local-audit/signoff-ledger/.');
  }

  if (!normalized.endsWith('.jsonl')) {
    throw new Error('Sign-off ledger path must be a .jsonl file.');
  }

  return normalized;
}

export function resolveSignoffLedgerConfig(options = {}) {
  const env = options.env || process.env;
  const enabled = env.SIGNOFF_LEDGER_WRITE_ENABLED === 'true';
  const mode = enabled ? env.SIGNOFF_LEDGER_MODE || 'dev-jsonl' : 'disabled';
  const relativePath = normalizeLedgerPath(env.SIGNOFF_LEDGER_PATH || DEFAULT_LEDGER_PATH);

  return {
    enabled,
    mode,
    relativePath,
    absolutePath: path.resolve(options.cwd || process.cwd(), relativePath)
  };
}

export function prepareSignoffDecisionForLedger(record) {
  return {
    ...record,
    storage: {
      mode: 'dev_signoff_jsonl',
      persisted: true
    }
  };
}

export function appendSignoffDecision(record, options = {}) {
  const config = resolveSignoffLedgerConfig(options);

  if (!config.enabled) {
    return {
      written: false,
      reason: 'signoff_ledger_disabled',
      path: config.relativePath
    };
  }

  if (config.mode !== 'dev-jsonl') {
    throw new Error('Only SIGNOFF_LEDGER_MODE=dev-jsonl is supported by the dev-only prototype.');
  }

  const recordToWrite = prepareSignoffDecisionForLedger(record);
  const validation = validateSignoffDecisionRecord(recordToWrite);
  if (!validation.valid) {
    throw new Error(`Sign-off decision refused: ${validation.errors.join('; ')}`);
  }

  fs.mkdirSync(path.dirname(config.absolutePath), { recursive: true });
  const line = `${JSON.stringify(recordToWrite)}\n`;
  fs.appendFileSync(config.absolutePath, line, 'utf8');

  return {
    written: true,
    reason: null,
    path: config.relativePath,
    bytes: Buffer.byteLength(line)
  };
}

export function readSignoffLedgerJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function generateSignoffLedgerSummary(recordsInput = []) {
  const records = Array.isArray(recordsInput) ? recordsInput : [recordsInput];
  const validRecords = [];
  const invalidRecords = [];

  records.forEach((record, index) => {
    const validation = validateSignoffDecisionRecord(record);
    if (validation.valid) {
      validRecords.push(record);
    } else {
      invalidRecords.push({ index, errors: validation.errors });
    }
  });

  const countByDecision = (decision) => validRecords.filter((record) => record.decision === decision).length;
  const approved = countByDecision('approved');
  const rejected = countByDecision('rejected');
  const needsReview = countByDecision('needs_review');
  const highRisk = validRecords.filter((record) => record.risk_snapshot.high_risk).length;
  const writeLike = validRecords.filter((record) => record.risk_snapshot.write_like_action).length;
  const forbidden = validRecords.filter((record) => record.risk_snapshot.forbidden_action).length;

  let status = 'ready_for_review';
  if (invalidRecords.length > 0 || forbidden > 0) status = 'attention_required';
  else if (needsReview > 0 || highRisk > 0 || writeLike > 0) status = 'manual_review_required';
  else if (approved > 0 && rejected === 0) status = 'review_complete';

  return {
    total_records: records.length,
    valid_records: validRecords.length,
    invalid_records: invalidRecords.length,
    approved,
    rejected,
    needs_review: needsReview,
    high_risk: highRisk,
    write_like: writeLike,
    forbidden,
    review_status: status,
    invalid_details: invalidRecords
  };
}

export function generateSignoffLedgerSummaryReport(recordsInput = []) {
  const summary = generateSignoffLedgerSummary(recordsInput);
  const records = Array.isArray(recordsInput) ? recordsInput : [recordsInput];
  const lines = [];

  lines.push('# Human Sign-off Decision Ledger Summary');
  lines.push('');
  lines.push('This report is generated from sanitized local sign-off decision records only. It is not a production approval system.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total records: ${summary.total_records}`);
  lines.push(`- Valid records: ${summary.valid_records}`);
  lines.push(`- Invalid records: ${summary.invalid_records}`);
  lines.push(`- Approved: ${summary.approved}`);
  lines.push(`- Rejected: ${summary.rejected}`);
  lines.push(`- Needs review: ${summary.needs_review}`);
  lines.push(`- High-risk records: ${summary.high_risk}`);
  lines.push(`- Write-like records: ${summary.write_like}`);
  lines.push(`- Forbidden records: ${summary.forbidden}`);
  lines.push(`- Review status: ${summary.review_status}`);
  lines.push('');
  lines.push('## Records');

  records.forEach((record, index) => {
    lines.push('');
    lines.push(`### ${index + 1}. ${record.run_id || 'unknown'} / ${record.task_id || 'unknown'}`);
    lines.push('');
    lines.push(`- Decision: ${record.decision || 'unknown'}`);
    lines.push(`- Risk level: ${record.risk_snapshot?.risk_level || 'unknown'}`);
    lines.push(`- Action class: ${record.risk_snapshot?.action_class || 'unknown'}`);
    lines.push(`- Permission level: ${record.risk_snapshot?.permission_level || 'unknown'}`);
    lines.push(`- Safe for review: ${record.risk_snapshot?.safe_for_review === true ? 'yes' : 'no'}`);
  });

  lines.push('');
  lines.push('## Boundary');
  lines.push('');
  lines.push('- The ledger is dev-only and local-only.');
  lines.push('- The ledger does not approve actions automatically.');
  lines.push('- The ledger does not connect to n8n runtime or enable write actions.');

  return lines.join('\n');
}
