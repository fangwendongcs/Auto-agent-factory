const SECRET_PATTERNS = [
  new RegExp(`${'Bear'}er\\s+\\S{8,}`, 'i'),
  /sk-[A-Za-z0-9_-]{12,}/,
  /ghp_[A-Za-z0-9_]{12,}/,
  new RegExp(`${'Author'}ization\\s*:`, 'i'),
  new RegExp(`${'api'}[_-]?${'key'}\\s*[:=]`, 'i'),
  new RegExp(`${'secret'}\\s*[:=]`, 'i')
];

const TRANSIENT_PROVIDER_ERRORS = new Set([
  'timeout',
  'provider_timeout',
  'provider_aborted',
  'provider_output_truncated'
]);

const REVIEW_ERRORS = new Set([
  'approval_blocked',
  'provider_invalid_json',
  'provider_response_missing',
  'malformed_evidence',
  'empty_response',
  'unknown'
]);

const STOP_ERRORS = new Set([
  'forbidden_action',
  'input_error',
  'workflow_config_error'
]);

function safeString(value, fallback) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

function safeInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function assertNoSecretLikeContent(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error('Recovery policy refused because secret-like content was detected.');
    }
  }
}

function normalizeErrorClass(input = {}) {
  const providerError = input.provider_error && typeof input.provider_error === 'object'
    ? input.provider_error
    : {};
  const error = input.error && typeof input.error === 'object'
    ? input.error
    : {};

  const explicitClass = safeString(
    input.error_class || providerError.class || providerError.code || error.class || error.code,
    ''
  );
  const message = [
    input.error_message,
    providerError.message,
    error.message,
    input.summary,
    input.status
  ].filter(Boolean).join(' ').toLowerCase();

  if (explicitClass) return explicitClass;
  if (message.includes('truncated') || message.includes('finish_reason=length')) {
    return 'provider_output_truncated';
  }
  if (message.includes('aborted') || message.includes('socket')) {
    return 'provider_aborted';
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'provider_timeout';
  }
  if (message.includes('forbidden')) return 'forbidden_action';
  if (message.includes('approval')) return 'approval_blocked';
  if (input.status === 'timeout') return 'timeout';
  if (input.status === 'blocked') return 'approval_blocked';
  return 'unknown';
}

function buildDecision(errorClass, retryCount, maxRetries) {
  if (STOP_ERRORS.has(errorClass)) {
    return {
      decision: 'stop',
      next_action: 'stop_run',
      stop_conditions: [`${errorClass}_is_not_recoverable_by_retry`]
    };
  }

  if (TRANSIENT_PROVIDER_ERRORS.has(errorClass)) {
    if (retryCount < maxRetries) {
      return {
        decision: 'retry',
        next_action: 'retry_provider_readonly',
        stop_conditions: [`retry_count_reaches_${maxRetries}`]
      };
    }

    return {
      decision: 'stop',
      next_action: 'stop_run',
      stop_conditions: ['retry_budget_exhausted']
    };
  }

  if (REVIEW_ERRORS.has(errorClass) || errorClass === 'provider_error') {
    return {
      decision: 'needs_review',
      next_action: 'manual_review',
      stop_conditions: ['human_review_required_before_retry']
    };
  }

  return {
    decision: 'needs_review',
    next_action: 'manual_review',
    stop_conditions: ['unclassified_error_requires_review']
  };
}

function reasonFor(errorClass, decision, retryCount, maxRetries) {
  if (decision === 'retry') {
    return `${errorClass} appears transient; retry the read-only provider path within the bounded retry budget (${retryCount}/${maxRetries}).`;
  }

  if (decision === 'stop') {
    if (retryCount >= maxRetries && TRANSIENT_PROVIDER_ERRORS.has(errorClass)) {
      return `${errorClass} reached the retry limit (${retryCount}/${maxRetries}); stop the run and keep it reviewable.`;
    }
    return `${errorClass} should not be retried automatically; stop the run and preserve the safety boundary.`;
  }

  return `${errorClass} requires human review before another attempt or follow-up action.`;
}

export function generateRecoveryPolicy(input = {}, options = {}) {
  assertNoSecretLikeContent(input);

  const maxRetries = safeInteger(
    options.max_retries ?? input.max_retries ?? input.context?.max_retries,
    2,
    0,
    3
  );
  const retryCount = safeInteger(
    options.retry_count ?? input.retry_count ?? input.context?.retry_count,
    0,
    0,
    3
  );
  const timeoutMinutes = safeInteger(
    options.timeout_minutes ?? input.timeout_minutes ?? input.context?.timeout_minutes,
    15,
    1,
    30
  );
  const errorClass = normalizeErrorClass(input);
  const decision = buildDecision(errorClass, retryCount, maxRetries);

  const policy = {
    policy_version: 'v0.17-local-recovery-policy',
    run_id: safeString(input.run_id, 'gd_recovery_local'),
    task_id: safeString(input.task_id, 'task_recovery_local'),
    error_class: errorClass,
    decision: decision.decision,
    next_action: decision.next_action,
    max_retries: maxRetries,
    retry_count: retryCount,
    timeout_minutes: timeoutMinutes,
    stop_conditions: decision.stop_conditions,
    reason: safeString(input.recovery_reason, reasonFor(errorClass, decision.decision, retryCount, maxRetries)),
    safety: {
      read_only: true,
      write_actions_enabled: false,
      requires_human_review: decision.decision !== 'retry',
      secrets_included: false
    }
  };

  assertNoSecretLikeContent(policy);
  return policy;
}
