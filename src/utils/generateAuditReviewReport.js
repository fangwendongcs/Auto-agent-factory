import fs from 'node:fs';
import path from 'node:path';

const APPROVED_REPORT_DIR = path.join('.local-audit', 'reports');
const DEFAULT_REPORT_PATH = path.join(APPROVED_REPORT_DIR, 'latest-audit-report.md');

const SECRET_PATTERNS = [
  /Bearer\s+\S{8,}/i,
  /sk-[A-Za-z0-9_-]{12,}/,
  /ghp_[A-Za-z0-9_]{12,}/,
  /xoxb-[A-Za-z0-9-]{12,}/,
  /Authorization\s*:/i
];

const REPORT_DENY_PATTERNS = [
  ...SECRET_PATTERNS,
  new RegExp(['provider', 'response', 'raw'].join('_'), 'i'),
  new RegExp(['provider', 'request'].join('_'), 'i'),
  new RegExp(['full', 'prompt'].join('_'), 'i'),
  new RegExp(['raw', 'prompt'].join('_'), 'i'),
  new RegExp(`\\b${'message'}s\\b`, 'i')
];

function yesNo(value) {
  return value ? 'yes' : 'no';
}

function safe(value, fallback = 'n/a') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function recordHasSecretLikeValue(record) {
  const serialized = JSON.stringify(record);
  return SECRET_PATTERNS.some((pattern) => pattern.test(serialized));
}

function recordHasRawFields(record) {
  return Boolean(
    record &&
    typeof record === 'object' &&
    (
      Object.hasOwn(record, 'provider_request') ||
      Object.hasOwn(record, 'provider_response_raw') ||
      Object.hasOwn(record, 'provider_response_content') ||
      Object.hasOwn(record, 'raw_response') ||
      Object.hasOwn(record, 'messages') ||
      Object.hasOwn(record, 'prompt') ||
      Object.hasOwn(record, 'full_prompt')
    )
  );
}

export function validateAuditReportOutputPath(outputPath = DEFAULT_REPORT_PATH) {
  const requested = outputPath || DEFAULT_REPORT_PATH;

  if (path.isAbsolute(requested)) {
    throw new Error('Audit report output path must be relative and dev-only.');
  }

  const normalized = path.normalize(requested);

  if (normalized.startsWith('..') || normalized.includes(`..${path.sep}`)) {
    throw new Error('Audit report output path cannot traverse outside the project.');
  }

  if (!normalized.startsWith(`${APPROVED_REPORT_DIR}${path.sep}`)) {
    throw new Error('Audit report output path must stay under .local-audit/reports/.');
  }

  if (!normalized.endsWith('.md')) {
    throw new Error('Audit report output path must be a .md file.');
  }

  return normalized;
}

export function validateAuditReportContent(reportMarkdown = '') {
  const errors = [];

  for (const pattern of REPORT_DENY_PATTERNS) {
    if (pattern.test(reportMarkdown)) {
      errors.push('audit report contains denied raw or secret-like content');
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function writeAuditReviewReportArtifact(reportMarkdown, options = {}) {
  const env = options.env || process.env;
  const enabled = env.AUDIT_REPORT_WRITE_ENABLED === 'true';
  const relativePath = validateAuditReportOutputPath(
    env.AUDIT_REPORT_OUTPUT_PATH || DEFAULT_REPORT_PATH
  );

  if (!enabled) {
    return {
      written: false,
      reason: 'audit_report_write_disabled',
      path: relativePath
    };
  }

  const contentValidation = validateAuditReportContent(reportMarkdown);
  if (!contentValidation.valid) {
    throw new Error(`Audit report refused: ${contentValidation.errors.join('; ')}`);
  }

  const absolutePath = path.resolve(options.cwd || process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${reportMarkdown.trimEnd()}\n`, 'utf8');

  return {
    written: true,
    reason: null,
    path: relativePath,
    bytes: Buffer.byteLength(`${reportMarkdown.trimEnd()}\n`)
  };
}

export function evaluateAuditRecordForReview(record = {}) {
  const approval = record.approval_decision || {};
  const safety = record.safety || {};
  const redaction = record.redaction || {};
  const storage = record.storage || {};
  const provider = record.provider || {};

  const forbidden = approval.decision === 'forbidden' || record.permission_level === 'forbidden';
  const highRisk = record.risk_level === 'high';
  const writeLike = ['repo_write', 'shell_command', 'git_operation', 'external_write', 'deployment'].includes(record.action_class);
  const unsafeFlags = [
    safety.side_effects_enabled === true,
    safety.raw_prompt_stored === true,
    safety.raw_provider_response_stored === true,
    safety.secrets_stored === true,
    redaction.applied !== true,
    recordHasRawFields(record),
    recordHasSecretLikeValue(record)
  ];

  const safeForReview = unsafeFlags.every((flag) => flag === false);

  return {
    run_id: record.run_id || null,
    task_id: record.task_id || null,
    status: record.status || 'unknown',
    risk_level: record.risk_level || 'unknown',
    action_class: record.action_class || 'unknown',
    permission_level: record.permission_level || 'unknown',
    approval_decision: approval.decision || 'unknown',
    approval_blocked: Boolean(approval.blocked),
    approval_approved: Boolean(approval.approved),
    provider_mode: provider.mode || 'unknown',
    provider_status: provider.status || 'unknown',
    storage_mode: storage.mode || 'unknown',
    storage_persisted: Boolean(storage.persisted),
    no_write_default: safety.no_write_default === true,
    side_effects_enabled: safety.side_effects_enabled === true,
    raw_prompt_stored: safety.raw_prompt_stored === true,
    raw_provider_response_stored: safety.raw_provider_response_stored === true,
    secrets_stored: safety.secrets_stored === true,
    redaction_applied: redaction.applied === true,
    forbidden_action: forbidden,
    high_risk: highRisk,
    write_like_action: writeLike,
    safe_for_review: safeForReview,
    review_flags: {
      requires_attention: forbidden || highRisk || writeLike || !safeForReview || Boolean(approval.blocked),
      forbidden,
      high_risk: highRisk,
      write_like_action: writeLike,
      unsafe_storage_flags: !safeForReview
    }
  };
}

export function generateAuditReviewReport(recordsInput, options = {}) {
  const records = Array.isArray(recordsInput) ? recordsInput : [recordsInput];
  const title = options.title || 'Audit Review Report';
  const evaluations = records.map((record) => evaluateAuditRecordForReview(record));
  const total = evaluations.length;
  const safeCount = evaluations.filter((item) => item.safe_for_review).length;
  const attentionCount = evaluations.filter((item) => item.review_flags.requires_attention).length;
  const highRiskCount = evaluations.filter((item) => item.high_risk).length;
  const forbiddenCount = evaluations.filter((item) => item.forbidden_action).length;
  const writeLikeCount = evaluations.filter((item) => item.write_like_action).length;

  const lines = [];

  lines.push(`# ${title}`);
  lines.push('');
  lines.push('This report is generated from sanitized audit records only. It is not a production audit system.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total records: ${total}`);
  lines.push(`- Safe for review: ${safeCount}`);
  lines.push(`- Requires attention: ${attentionCount}`);
  lines.push(`- High-risk records: ${highRiskCount}`);
  lines.push(`- Forbidden-action records: ${forbiddenCount}`);
  lines.push(`- Write-like action records: ${writeLikeCount}`);
  lines.push('');
  lines.push('## Records');

  evaluations.forEach((item, index) => {
    lines.push('');
    lines.push(`### ${index + 1}. ${safe(item.run_id)} / ${safe(item.task_id)}`);
    lines.push('');
    lines.push(`- run_id: ${safe(item.run_id)}`);
    lines.push(`- task_id: ${safe(item.task_id)}`);
    lines.push(`- Status: ${safe(item.status)}`);
    lines.push(`- Risk level: ${safe(item.risk_level)}`);
    lines.push(`- Action class: ${safe(item.action_class)}`);
    lines.push(`- Permission level: ${safe(item.permission_level)}`);
    lines.push(`- Approval decision: ${safe(item.approval_decision)}`);
    lines.push(`- Approval blocked: ${yesNo(item.approval_blocked)}`);
    lines.push(`- Approval approved: ${yesNo(item.approval_approved)}`);
    lines.push(`- Provider mode: ${safe(item.provider_mode)}`);
    lines.push(`- Provider status: ${safe(item.provider_status)}`);
    lines.push(`- Storage mode: ${safe(item.storage_mode)}`);
    lines.push(`- Storage persisted: ${yesNo(item.storage_persisted)}`);
    lines.push(`- No-write default: ${yesNo(item.no_write_default)}`);
    lines.push(`- Side effects enabled: ${yesNo(item.side_effects_enabled)}`);
    lines.push(`- Prompt payload stored: ${yesNo(item.raw_prompt_stored)}`);
    lines.push(`- Provider response payload stored: ${yesNo(item.raw_provider_response_stored)}`);
    lines.push(`- Secrets stored: ${yesNo(item.secrets_stored)}`);
    lines.push(`- Redaction applied: ${yesNo(item.redaction_applied)}`);
    lines.push(`- Forbidden action: ${yesNo(item.forbidden_action)}`);
    lines.push(`- High risk: ${yesNo(item.high_risk)}`);
    lines.push(`- Write-like action: ${yesNo(item.write_like_action)}`);
    lines.push(`- Safe for review: ${yesNo(item.safe_for_review)}`);
  });

  lines.push('');
  lines.push('## Safety Boundary');
  lines.push('');
  lines.push('- Report input must be sanitized audit records.');
  lines.push('- The report does not require prompt payloads, provider message payloads, unredacted provider responses, credential headers, credentials, or tokens.');
  lines.push('- Generating this report does not modify n8n runtime and does not enable production execution.');

  return lines.join('\n');
}
