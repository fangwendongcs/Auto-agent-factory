const DEFAULT_NOW = '1970-01-01T00:00:00.000Z';
const MAX_SUMMARY_LENGTH = 180;

const EXCLUDED_FIELDS = [
  'prompt',
  'full_prompt',
  'raw_prompt',
  'messages',
  'provider_request',
  'provider_response_raw',
  'provider_response_content',
  'raw_response',
  'authorization',
  'api_key',
  'token',
  'secret',
  'password',
  'credential',
  'cookie'
];

function truncate(value, maxLength = MAX_SUMMARY_LENGTH) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'No goal summary provided.';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function safeStringOrNull(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeRiskLevel(value) {
  return ['low', 'medium', 'high'].includes(value) ? value : 'low';
}

function normalizeActionClass(value) {
  return [
    'read_only',
    'local_draft',
    'repo_write',
    'shell_command',
    'git_operation',
    'external_write',
    'deployment'
  ].includes(value) ? value : 'read_only';
}

function normalizePermissionLevel(value) {
  return ['read_only', 'draft', 'write_action', 'forbidden'].includes(value)
    ? value
    : 'read_only';
}

function summarizeApprovalDecision(input = {}) {
  const approval =
    input.approval_decision && typeof input.approval_decision === 'object'
      ? input.approval_decision
      : {};

  const decision = [
    'allow',
    'approved',
    'needs_human_approval',
    'forbidden',
    'invalid_request',
    'rejected'
  ].includes(approval.decision)
    ? approval.decision
    : 'needs_human_approval';

  return {
    decision,
    blocked: Boolean(approval.blocked),
    approved: decision === 'forbidden' ? false : Boolean(approval.approved),
    requires_human_approval: Boolean(approval.requires_human_approval),
    reason_summary: safeStringOrNull(approval.reason)
  };
}

function summarizeProvider(input = {}) {
  const agentResult =
    input.agent_result && typeof input.agent_result === 'object'
      ? input.agent_result
      : {};
  const provider =
    agentResult.provider && typeof agentResult.provider === 'object'
      ? agentResult.provider
      : input.provider && typeof input.provider === 'object'
        ? input.provider
        : {};

  return {
    mode: provider.mode || input.provider_mode || input.agent_mode || 'unknown',
    name: safeStringOrNull(provider.name),
    model: safeStringOrNull(provider.model || input.provider_runtime_model),
    status: safeStringOrNull(input.provider_call_status || agentResult.status || input.status)
  };
}

export function createSanitizedRunRecord(input = {}, options = {}) {
  const now = options.now || input.created_at || DEFAULT_NOW;
  const criteria = Array.isArray(input.criteria) ? input.criteria : [];

  return {
    audit_record_version: 'v0.8b-sanitized-audit-record',
    run_id: input.run_id || 'gd_unknown',
    task_id: input.task_id || 'task_unknown',
    record_type: 'sanitized_run_record',
    created_at: now,
    status: input.status || 'unknown',
    goal_summary: truncate(input.goal || input.goal_summary),
    criteria_count: criteria.length,
    risk_level: normalizeRiskLevel(input.risk_level),
    action_class: normalizeActionClass(input.action_class),
    permission_level: normalizePermissionLevel(input.permission_level),
    provider: summarizeProvider(input),
    approval_decision: summarizeApprovalDecision(input),
    timestamps: {
      started_at: safeStringOrNull(input.started_at),
      finished_at: safeStringOrNull(input.finished_at || now)
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
      excluded_fields: [...EXCLUDED_FIELDS]
    }
  };
}
