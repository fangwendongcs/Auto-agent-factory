import {
  appendSignoffDecision,
  createSignoffDecisionRecord,
  validateSignoffDecisionRecord
} from './signoffDecisionLedger.js';
import { validateAuditRecordForStorage } from './auditStorage.js';
import { validatePayload } from './validatePayload.js';

const DEFAULT_NOW = '1970-01-01T00:00:00.000Z';
const MAX_TEXT_LENGTH = 240;

const DENYLISTED_KEYS = new Set([
  'authorization',
  'api_key',
  'openai_api_key',
  'n8n_api_key',
  'token',
  'secret',
  'password',
  'credential',
  'cookie',
  'headers',
  'body',
  'prompt',
  'full_prompt',
  'raw_prompt',
  'messages',
  'provider_request',
  'provider_response_raw',
  'provider_response_content',
  'raw_response'
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
  const text = value.replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function truncate(value, fallback = 'No summary provided.') {
  const text = safeString(value, fallback);
  return text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH - 3)}...` : text;
}

function safeId(prefix, value) {
  const source = safeString(value, `${prefix}_local`)
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .slice(0, 80);
  return source.startsWith(`${prefix}_`) ? source : `${prefix}_${source}`;
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

export function validateHumanApprovalConsoleInput(value = {}) {
  const errors = [];
  const unsafeKeys = collectUnsafeKeys(value);
  const unsafeValues = collectUnsafeStringValues(value);

  if (unsafeKeys.length > 0) {
    errors.push(`approval console input contains denied field(s): ${unsafeKeys.join(', ')}`);
  }
  if (unsafeValues.length > 0) {
    errors.push(`approval console input contains secret-like value(s): ${unsafeValues.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function approvalDecisionForReview(input = {}, sourceType) {
  const approval = input.approval_decision && typeof input.approval_decision === 'object'
    ? input.approval_decision
    : {};

  if (sourceType === 'recovery_policy') {
    return {
      decision: 'needs_human_approval',
      blocked: true,
      approved: false,
      requires_human_approval: true,
      reason_summary: 'Recovery advice must be reviewed by a human before any retry or follow-up action.'
    };
  }

  return {
    decision: ['allow', 'approved', 'needs_human_approval', 'forbidden', 'invalid_request', 'rejected'].includes(approval.decision)
      ? approval.decision
      : 'needs_human_approval',
    blocked: approval.blocked !== undefined ? Boolean(approval.blocked) : true,
    approved: approval.approved === true,
    requires_human_approval: approval.requires_human_approval !== undefined
      ? Boolean(approval.requires_human_approval)
      : true,
    reason_summary: truncate(approval.reason_summary || input.reason_summary, 'Human approval console review item.')
  };
}

function providerForReview(input = {}, sourceType) {
  const provider = input.provider && typeof input.provider === 'object' ? input.provider : {};
  return {
    mode: safeString(provider.mode, sourceType === 'recovery_policy' ? 'recovery-policy' : 'local-review'),
    name: provider.name === undefined ? null : provider.name,
    model: provider.model === undefined ? null : provider.model,
    status: safeString(provider.status, sourceType === 'recovery_policy' ? 'failed' : 'review_pending')
  };
}

function auditRecordFromRecoveryPolicy(input = {}, options = {}) {
  const policy = input.recovery_policy && typeof input.recovery_policy === 'object'
    ? input.recovery_policy
    : input;
  const validation = validatePayload('recoveryPolicy', policy);
  if (!validation.valid) {
    throw new Error(`Recovery policy input refused: ${validation.errors.join('; ')}`);
  }

  const now = options.now || input.created_at || DEFAULT_NOW;

  return {
    audit_record_version: 'v0.8b-sanitized-audit-record',
    run_id: policy.run_id,
    task_id: policy.task_id,
    record_type: 'sanitized_run_record',
    created_at: now,
    status: `recovery_${policy.decision}`,
    goal_summary: truncate(
      input.goal_summary || `Review recovery policy ${policy.error_class}: ${policy.next_action}.`,
      'Review recovery policy.'
    ),
    criteria_count: 1,
    risk_level: policy.decision === 'stop' ? 'high' : 'medium',
    action_class: 'read_only',
    permission_level: 'read_only',
    provider: providerForReview(input, 'recovery_policy'),
    approval_decision: approvalDecisionForReview(input, 'recovery_policy'),
    timestamps: {
      started_at: now,
      finished_at: now
    },
    storage: {
      mode: 'mock_repo_contract',
      persisted: false
    },
    safety: {
      no_write_default: true,
      side_effects_enabled: false,
      raw_prompt_stored: false,
      raw_provider_response_stored: false,
      secrets_stored: false
    },
    redaction: {
      applied: true,
      excluded_fields: [
        'authorization',
        'api_key',
        'token',
        'password',
        'credential',
        'provider_request',
        'provider_response_raw',
        'raw_response',
        'prompt',
        'messages'
      ]
    }
  };
}

function auditRecordFromHighRiskDecision(input = {}, options = {}) {
  const now = options.now || input.created_at || DEFAULT_NOW;
  const actionClass = safeString(input.action_class, 'repo_write');
  const permissionLevel = ['shell_command', 'git_operation', 'external_write', 'deployment'].includes(actionClass)
    ? 'forbidden'
    : 'write_action';

  return {
    audit_record_version: 'v0.8b-sanitized-audit-record',
    run_id: safeId('gd', input.run_id || input.execution_id || 'v018_review_local'),
    task_id: safeId('task', input.task_id || input.last_node_executed || 'v018_review_local'),
    record_type: 'sanitized_run_record',
    created_at: now,
    status: safeString(input.status, 'needs_human_approval'),
    goal_summary: truncate(input.goal_summary || input.summary, 'High-risk decision requires local human review.'),
    criteria_count: Number.isInteger(input.criteria_count) ? input.criteria_count : 1,
    risk_level: 'high',
    action_class: actionClass,
    permission_level: safeString(input.permission_level, permissionLevel),
    provider: providerForReview(input, 'high_risk_decision'),
    approval_decision: approvalDecisionForReview(input, 'high_risk_decision'),
    timestamps: {
      started_at: now,
      finished_at: now
    },
    storage: {
      mode: 'mock_repo_contract',
      persisted: false
    },
    safety: {
      no_write_default: true,
      side_effects_enabled: false,
      raw_prompt_stored: false,
      raw_provider_response_stored: false,
      secrets_stored: false
    },
    redaction: {
      applied: true,
      excluded_fields: [
        'authorization',
        'api_key',
        'token',
        'password',
        'credential',
        'provider_request',
        'provider_response_raw',
        'raw_response',
        'prompt',
        'messages'
      ]
    }
  };
}

export function normalizeHumanApprovalReviewItem(input = {}, options = {}) {
  const inputValidation = validateHumanApprovalConsoleInput(input);
  if (!inputValidation.valid) {
    throw new Error(`Human approval console input refused: ${inputValidation.errors.join('; ')}`);
  }

  const sourceType = input.audit_record_version === 'v0.8b-sanitized-audit-record'
    ? 'audit_record'
    : input.recovery_policy || input.policy_version === 'v0.17-local-recovery-policy'
      ? 'recovery_policy'
      : 'high_risk_decision';
  const auditRecord = sourceType === 'audit_record'
    ? input
    : sourceType === 'recovery_policy'
      ? auditRecordFromRecoveryPolicy(input, options)
      : auditRecordFromHighRiskDecision(input, options);
  const auditValidation = validateAuditRecordForStorage(auditRecord);

  if (!auditValidation.valid) {
    throw new Error(`Human approval console audit projection refused: ${auditValidation.errors.join('; ')}`);
  }

  return {
    console_version: 'v0.18-human-approval-console-lite',
    source_type: sourceType,
    run_id: auditRecord.run_id,
    task_id: auditRecord.task_id,
    status: auditRecord.status,
    risk_level: auditRecord.risk_level,
    action_class: auditRecord.action_class,
    permission_level: auditRecord.permission_level,
    recommended_decision: auditRecord.permission_level === 'forbidden' ? 'rejected' : 'needs_review',
    review_summary: auditRecord.goal_summary,
    audit_record: auditRecord,
    safety: {
      local_only: true,
      dev_only_ledger: true,
      no_auto_retry: true,
      no_auto_approval: true,
      no_write_default: true,
      automatic_execution_enabled: false,
      workflow_runtime_modified: false,
      side_effects_enabled: false,
      secrets_included: false
    }
  };
}

export function createHumanApprovalConsoleDecision(input = {}, decisionInput = {}, options = {}) {
  const reviewItem = normalizeHumanApprovalReviewItem(input, options);
  const decisionRecord = createSignoffDecisionRecord(reviewItem.audit_record, decisionInput, options);
  const validation = validateSignoffDecisionRecord(decisionRecord);

  if (!validation.valid) {
    throw new Error(`Human approval console decision refused: ${validation.errors.join('; ')}`);
  }

  return {
    review_item: reviewItem,
    decision_record: decisionRecord
  };
}

export function appendHumanApprovalConsoleDecision(decisionRecord, options = {}) {
  return appendSignoffDecision(decisionRecord, options);
}

export function renderHumanApprovalConsole(reviewItem, decisionRecord = null, writeResult = null) {
  const lines = [];

  lines.push('# Human Approval Console Lite');
  lines.push('');
  lines.push('This is a local review console. It records human decisions only and does not execute retries or write actions.');
  lines.push('');
  lines.push('## Review Item');
  lines.push('');
  lines.push(`- Console version: ${reviewItem.console_version}`);
  lines.push(`- Source type: ${reviewItem.source_type}`);
  lines.push(`- Run: ${reviewItem.run_id}`);
  lines.push(`- Task: ${reviewItem.task_id}`);
  lines.push(`- Status: ${reviewItem.status}`);
  lines.push(`- Risk level: ${reviewItem.risk_level}`);
  lines.push(`- Action class: ${reviewItem.action_class}`);
  lines.push(`- Permission level: ${reviewItem.permission_level}`);
  lines.push(`- Recommended decision: ${reviewItem.recommended_decision}`);
  lines.push(`- Summary: ${reviewItem.review_summary}`);
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('- Local only: yes');
  lines.push('- Dev-only ledger: yes');
  lines.push('- Automatic retry: no');
  lines.push('- Automatic approval: no');
  lines.push('- Workflow runtime modified: no');
  lines.push('- Side effects enabled: no');
  lines.push('- Secrets included: no');

  if (decisionRecord) {
    lines.push('');
    lines.push('## Human Decision');
    lines.push('');
    lines.push(`- Decision id: ${decisionRecord.decision_id}`);
    lines.push(`- Decision: ${decisionRecord.decision}`);
    lines.push(`- Reviewer: ${decisionRecord.reviewer.id}`);
    lines.push(`- Reason: ${decisionRecord.reason_summary}`);
    lines.push(`- Notes: ${decisionRecord.notes_summary || 'n/a'}`);
  }

  if (writeResult) {
    lines.push('');
    lines.push('## Ledger');
    lines.push('');
    lines.push(`- Written: ${writeResult.written ? 'yes' : 'no'}`);
    lines.push(`- Reason: ${writeResult.reason || 'n/a'}`);
    lines.push(`- Path: ${writeResult.path}`);
  }

  return lines.join('\n');
}
