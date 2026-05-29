const SECRET_PATTERNS = [
  /Bearer\s+\S{8,}/i,
  /sk-[A-Za-z0-9_-]{12,}/,
  /ghp_[A-Za-z0-9_]{12,}/,
  /xoxb-[A-Za-z0-9-]{12,}/,
  /Authorization\s*:/i
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
    lines.push(`- Raw prompt stored: ${yesNo(item.raw_prompt_stored)}`);
    lines.push(`- Raw provider response stored: ${yesNo(item.raw_provider_response_stored)}`);
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
  lines.push('- The report does not require raw prompts, provider request messages, raw provider responses, credential headers, credentials, or tokens.');
  lines.push('- Generating this report does not modify n8n runtime and does not enable production execution.');

  return lines.join('\n');
}
