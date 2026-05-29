import fs from 'node:fs';
import path from 'node:path';
import { evaluateAuditRecordForReview } from './generateAuditReviewReport.js';

const APPROVED_SIGNOFF_DIR = path.join('.local-audit', 'signoff');
const DEFAULT_SIGNOFF_PATH = path.join(APPROVED_SIGNOFF_DIR, 'latest-signoff-review.md');

const SECRET_PATTERNS = [
  new RegExp(`${'Bear'}er\\s+\\S{8,}`, 'i'),
  /sk-[A-Za-z0-9_-]{12,}/,
  /ghp_[A-Za-z0-9_]{12,}/,
  /xoxb-[A-Za-z0-9-]{12,}/,
  new RegExp(`${'Author'}ization\\s*:`, 'i')
];

const SIGNOFF_DENY_PATTERNS = [
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

export function getRecommendedSignoffDecision(record = {}) {
  const evaluation = evaluateAuditRecordForReview(record);

  if (!evaluation.safe_for_review) {
    return {
      decision: 'reject',
      reason: 'Record is not safe for review because sanitized audit safety checks failed.'
    };
  }

  if (evaluation.forbidden_action) {
    return {
      decision: 'reject',
      reason: 'Forbidden action must be rejected before any execution step.'
    };
  }

  if (evaluation.high_risk && !evaluation.approval_approved) {
    return {
      decision: 'needs_review',
      reason: 'High-risk action requires explicit human approval.'
    };
  }

  if (evaluation.write_like_action) {
    return {
      decision: 'needs_review',
      reason: 'Write-like action remains human-reviewed by policy.'
    };
  }

  if (evaluation.action_class === 'read_only' && evaluation.safe_for_review) {
    return {
      decision: 'needs_review',
      reason: 'Read-only record is safe to inspect, but this local package does not auto-approve runs.'
    };
  }

  return {
    decision: 'needs_review',
    reason: 'Manual review is required before any next-stage action.'
  };
}

export function validateHumanSignoffOutputPath(outputPath = DEFAULT_SIGNOFF_PATH) {
  const requested = outputPath || DEFAULT_SIGNOFF_PATH;

  if (path.isAbsolute(requested)) {
    throw new Error('Human sign-off output path must be relative and dev-only.');
  }

  const normalized = path.normalize(requested);

  if (normalized.startsWith('..') || normalized.includes(`..${path.sep}`)) {
    throw new Error('Human sign-off output path cannot traverse outside the project.');
  }

  if (!normalized.startsWith(`${APPROVED_SIGNOFF_DIR}${path.sep}`)) {
    throw new Error('Human sign-off output path must stay under .local-audit/signoff/.');
  }

  if (!normalized.endsWith('.md')) {
    throw new Error('Human sign-off output path must be a .md file.');
  }

  return normalized;
}

export function validateHumanSignoffContent(markdown = '') {
  const errors = [];

  for (const pattern of SIGNOFF_DENY_PATTERNS) {
    if (pattern.test(markdown)) {
      errors.push('human sign-off review contains denied raw or secret-like content');
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function writeHumanSignoffReviewArtifact(markdown, options = {}) {
  const env = options.env || process.env;
  const enabled = env.HUMAN_SIGNOFF_WRITE_ENABLED === 'true';
  const relativePath = validateHumanSignoffOutputPath(
    env.HUMAN_SIGNOFF_OUTPUT_PATH || DEFAULT_SIGNOFF_PATH
  );

  if (!enabled) {
    return {
      written: false,
      reason: 'human_signoff_write_disabled',
      path: relativePath
    };
  }

  const contentValidation = validateHumanSignoffContent(markdown);
  if (!contentValidation.valid) {
    throw new Error(`Human sign-off review refused: ${contentValidation.errors.join('; ')}`);
  }

  const absolutePath = path.resolve(options.cwd || process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${markdown.trimEnd()}\n`, 'utf8');

  return {
    written: true,
    reason: null,
    path: relativePath,
    bytes: Buffer.byteLength(`${markdown.trimEnd()}\n`)
  };
}

function pushRecordSection(lines, record, index) {
  const evaluation = evaluateAuditRecordForReview(record);
  const recommendation = getRecommendedSignoffDecision(record);

  lines.push('');
  lines.push(`## Review Item ${index + 1}: ${safe(evaluation.run_id)} / ${safe(evaluation.task_id)}`);
  lines.push('');
  lines.push('### Run Context');
  lines.push('');
  lines.push(`- run_id: ${safe(evaluation.run_id)}`);
  lines.push(`- task_id: ${safe(evaluation.task_id)}`);
  lines.push(`- Status: ${safe(evaluation.status)}`);
  lines.push(`- Risk level: ${safe(evaluation.risk_level)}`);
  lines.push(`- Action class: ${safe(evaluation.action_class)}`);
  lines.push(`- Permission level: ${safe(evaluation.permission_level)}`);
  lines.push('');
  lines.push('### Approval Decision');
  lines.push('');
  lines.push(`- Existing decision: ${safe(evaluation.approval_decision)}`);
  lines.push(`- Existing blocked flag: ${yesNo(evaluation.approval_blocked)}`);
  lines.push(`- Existing approved flag: ${yesNo(evaluation.approval_approved)}`);
  lines.push(`- Recommended decision: ${recommendation.decision}`);
  lines.push(`- Recommendation reason: ${recommendation.reason}`);
  lines.push('');
  lines.push('### Provider Summary');
  lines.push('');
  lines.push(`- Provider mode: ${safe(evaluation.provider_mode)}`);
  lines.push(`- Provider status: ${safe(evaluation.provider_status)}`);
  lines.push('');
  lines.push('### Safety Flags');
  lines.push('');
  lines.push(`- No-write default: ${yesNo(evaluation.no_write_default)}`);
  lines.push(`- Side effects enabled: ${yesNo(evaluation.side_effects_enabled)}`);
  lines.push(`- Prompt payload stored: ${yesNo(evaluation.raw_prompt_stored)}`);
  lines.push(`- Provider response payload stored: ${yesNo(evaluation.raw_provider_response_stored)}`);
  lines.push(`- Secrets stored: ${yesNo(evaluation.secrets_stored)}`);
  lines.push(`- Redaction applied: ${yesNo(evaluation.redaction_applied)}`);
  lines.push(`- Storage mode: ${safe(evaluation.storage_mode)}`);
  lines.push(`- Storage persisted: ${yesNo(evaluation.storage_persisted)}`);
  lines.push(`- Forbidden action: ${yesNo(evaluation.forbidden_action)}`);
  lines.push(`- High risk: ${yesNo(evaluation.high_risk)}`);
  lines.push(`- Write-like action: ${yesNo(evaluation.write_like_action)}`);
  lines.push(`- Safe for review: ${yesNo(evaluation.safe_for_review)}`);
  lines.push('');
  lines.push('### Human Checklist');
  lines.push('');
  lines.push('- [ ] Confirm run/task identifiers match the intended review target.');
  lines.push('- [ ] Confirm the request is not forbidden and does not bypass the approval boundary.');
  lines.push('- [ ] Confirm no file write, shell, Git, or external write action is enabled.');
  lines.push('- [ ] Confirm redaction is applied and no secret-like values are present.');
  lines.push('- [ ] Confirm provider output, if present, is read-only and review-only.');
  lines.push('- [ ] Confirm any high-risk or write-like action remains blocked until explicit review.');
  lines.push('');
  lines.push('### Sign-off Block');
  lines.push('');
  lines.push('- reviewer:');
  lines.push('- decision:');
  lines.push('- timestamp:');
  lines.push('- notes:');
}

export function generateHumanSignoffReview(recordsInput, options = {}) {
  const records = Array.isArray(recordsInput) ? recordsInput : [recordsInput];
  const title = options.title || 'Human Sign-off Review Package';
  const recommendations = records.map((record) => getRecommendedSignoffDecision(record));

  const lines = [];
  lines.push(`# ${title}`);
  lines.push('');
  lines.push('This package is generated from sanitized audit records only. It is a local review artifact, not a production approval system.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total review items: ${records.length}`);
  lines.push(`- Recommended approve: ${recommendations.filter((item) => item.decision === 'approve').length}`);
  lines.push(`- Recommended needs_review: ${recommendations.filter((item) => item.decision === 'needs_review').length}`);
  lines.push(`- Recommended reject: ${recommendations.filter((item) => item.decision === 'reject').length}`);

  records.forEach((record, index) => pushRecordSection(lines, record, index));

  lines.push('');
  lines.push('## Boundary');
  lines.push('');
  lines.push('- This package does not approve actions automatically.');
  lines.push('- This package does not connect to n8n runtime.');
  lines.push('- This package does not enable provider calls, shell commands, Git operations, file writes, or external write actions.');
  lines.push('- This package must be generated from sanitized audit records only.');

  return lines.join('\n');
}
