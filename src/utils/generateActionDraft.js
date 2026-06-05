const SECRET_PATTERNS = [
  new RegExp(`${'Bear'}er\\s+\\S{8,}`, 'i'),
  /sk-[A-Za-z0-9_-]{12,}/,
  /ghp_[A-Za-z0-9_]{12,}/,
  new RegExp(`${'Author'}ization\\s*:`, 'i'),
  new RegExp(`${'api'}[_-]?${'key'}\\s*[:=]`, 'i'),
  new RegExp(`${'secret'}\\s*[:=]`, 'i')
];

function safe(value, fallback = 'n/a') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function assertNoSecretLikeContent(text) {
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error('Action draft refused because secret-like content was detected.');
    }
  }
}

function summarizeAction(record = {}) {
  const actionClass = safe(record.action_class, 'read_only');
  const riskLevel = safe(record.risk_level, 'low');

  if (actionClass === 'read_only') {
    return 'Inspect the sanitized run record and prepare review-only follow-up actions.';
  }

  if (actionClass === 'local_draft') {
    return 'Prepare local draft artifacts for human review without executing write actions.';
  }

  return `Prepare a human review package for ${riskLevel} ${actionClass} work; do not execute it automatically.`;
}

function isSignoffDecisionRecord(record = {}) {
  return record.record_type === 'human_signoff_decision' ||
    record.signoff_decision_version === 'v0.11-dev-signoff-decision';
}

function handoffStatusForDecision(decision) {
  if (decision === 'approved') return 'draft_after_approval';
  if (decision === 'rejected') return 'blocked_rejected';
  if (decision === 'needs_review') return 'blocked_needs_review';
  return 'draft_for_review';
}

function actionForDecision(record = {}) {
  const decision = safe(record.decision, 'needs_review');
  const actionClass = safe(record.risk_snapshot?.action_class, 'read_only');
  const riskLevel = safe(record.risk_snapshot?.risk_level, 'unknown');

  if (decision === 'rejected') {
    return `Do not implement ${riskLevel} ${actionClass} work. Convert the rejection reason into review notes only.`;
  }

  if (decision === 'needs_review') {
    return `Prepare clarifying questions and a review checklist for ${riskLevel} ${actionClass} work; do not implement it.`;
  }

  if (decision === 'approved') {
    return `Prepare a draft-only handoff for ${riskLevel} ${actionClass} work. Treat the ledger decision as context, not as permission to execute in this thread.`;
  }

  return 'Prepare a review-only handoff draft from the human decision record.';
}

function contextFromSignoffDecision(record = {}) {
  const risk = record.risk_snapshot || {};
  const approval = record.approval_snapshot || {};
  const decision = safe(record.decision, 'needs_review');
  const reason = safe(record.reason_summary, 'Human decision requires local review.');
  const notes = safe(record.notes_summary, 'No notes provided.');

  return {
    sourceType: 'human_signoff_decision',
    runId: safe(record.run_id),
    taskId: safe(record.task_id),
    goalSummary: `Human decision ${decision} for ${safe(risk.risk_level, 'unknown')} ${safe(risk.action_class, 'unknown')} work. Reason: ${reason}`,
    providerMode: 'local-approval-console',
    providerName: 'human-signoff-ledger',
    providerStatus: safe(record.storage?.mode, 'mock_decision_contract'),
    riskLevel: safe(risk.risk_level, 'unknown'),
    actionClass: safe(risk.action_class, 'unknown'),
    permissionLevel: safe(risk.permission_level, 'unknown'),
    approvalDecision: safe(approval.existing_decision, 'unknown'),
    humanDecision: decision,
    handoffStatus: handoffStatusForDecision(decision),
    decisionReason: reason,
    decisionNotes: notes,
    nextAction: actionForDecision(record)
  };
}

function contextFromAuditRecord(record = {}) {
  return {
    sourceType: 'audit_record',
    runId: safe(record.run_id),
    taskId: safe(record.task_id),
    goalSummary: safe(record.goal_summary, 'Review sanitized local agent run.'),
    providerMode: safe(record.provider?.mode),
    providerName: safe(record.provider?.name),
    providerStatus: safe(record.provider?.status),
    riskLevel: safe(record.risk_level, 'low'),
    actionClass: safe(record.action_class, 'read_only'),
    permissionLevel: safe(record.permission_level, 'read_only'),
    approvalDecision: safe(record.approval_decision?.decision),
    humanDecision: 'not_recorded',
    handoffStatus: 'draft_for_review',
    decisionReason: safe(record.approval_decision?.reason_summary, 'No human decision record attached.'),
    decisionNotes: 'n/a',
    nextAction: summarizeAction(record)
  };
}

function normalizeDraftContext(record = {}) {
  return isSignoffDecisionRecord(record)
    ? contextFromSignoffDecision(record)
    : contextFromAuditRecord(record);
}

function githubDecisionSection(context) {
  if (context.sourceType !== 'human_signoff_decision') {
    return [
      '## Human decision',
      '- No V0.18 human decision record is attached.',
      '- Keep this issue as a review-only draft until a human reviewer decides next steps.'
    ].join('\n');
  }

  return [
    '## Human decision',
    `- Decision: ${context.humanDecision}`,
    `- Handoff status: ${context.handoffStatus}`,
    `- Reason: ${context.decisionReason}`,
    `- Notes: ${context.decisionNotes}`,
    '- This decision record is local review context only and does not execute workflow actions.'
  ].join('\n');
}

function commitMessageFor(context) {
  if (context.humanDecision === 'rejected') {
    return `chore: record rejected handoff for ${context.runId}`;
  }
  if (context.humanDecision === 'approved') {
    return `chore: draft approved handoff for ${context.runId}`;
  }
  if (context.humanDecision === 'needs_review') {
    return `chore: draft review checklist for ${context.runId}`;
  }
  return `chore: review local agent run ${context.runId}`;
}

export function generateActionDraft(record = {}) {
  const context = normalizeDraftContext(record);

  const draft = {
    draft_version: 'v0.19-local-action-draft',
    source_type: context.sourceType,
    run_id: context.runId,
    task_id: context.taskId,
    goal_summary: context.goalSummary,
    human_decision: context.humanDecision,
    handoff_status: context.handoffStatus,
    safety: {
      draft_only: true,
      write_actions_enabled: false,
      requires_human_review: true
    },
    codex_prompt: [
      `Review sanitized run ${context.runId} / ${context.taskId}.`,
      `Source: ${context.sourceType}; human decision: ${context.humanDecision}; handoff status: ${context.handoffStatus}.`,
      `Goal summary: ${context.goalSummary}`,
      `Risk: ${context.riskLevel}; action class: ${context.actionClass}; permission level: ${context.permissionLevel}; approval snapshot: ${context.approvalDecision}.`,
      `Decision reason: ${context.decisionReason}`,
      `Decision notes: ${context.decisionNotes}`,
      `Provider/context: ${context.providerName} (${context.providerMode}), status: ${context.providerStatus}.`,
      'Produce a safe implementation plan or code review. Do not run shell, Git, file-write, or external write actions unless the human explicitly approves them in the active Codex thread.',
      'If the decision is rejected or needs_review, do not implement; prepare only review notes, questions, or a blocked handoff.',
      'If the decision is approved, still prepare a draft-only handoff; do not treat this record as automatic execution permission.',
      `Requested next action: ${context.nextAction}`
    ].join('\n'),
    github_issue_draft: [
      `Title: ${context.handoffStatus} for local agent run ${context.runId}`,
      '',
      '## Context',
      context.goalSummary,
      '',
      githubDecisionSection(context),
      '',
      '## Safety boundary',
      `- Risk level: ${context.riskLevel}`,
      `- Action class: ${context.actionClass}`,
      `- Permission level: ${context.permissionLevel}`,
      `- Approval snapshot: ${context.approvalDecision}`,
      `- Human decision: ${context.humanDecision}`,
      '- This issue is a draft handoff only and does not authorize automatic write execution.',
      '',
      '## Acceptance criteria',
      '- Confirm the run/task IDs match the intended local review target.',
      '- Confirm no secrets, raw prompts, or raw provider responses are attached.',
      '- Confirm any write-like follow-up remains behind human approval.'
    ].join('\n'),
    commit_message: commitMessageFor(context),
    test_commands: [
      'npm test',
      'npm run workflow:validate:all',
      'npm run demo:local',
      'npm run approval:console'
    ]
  };

  assertNoSecretLikeContent(JSON.stringify(draft));
  return draft;
}

export function renderActionDraftMarkdown(draft) {
  const markdown = [
    '# Local Action Draft',
    '',
    `- source_type: ${draft.source_type}`,
    `- run_id: ${draft.run_id}`,
    `- task_id: ${draft.task_id}`,
    `- Human decision: ${draft.human_decision}`,
    `- Handoff status: ${draft.handoff_status}`,
    `- Draft only: ${draft.safety.draft_only ? 'yes' : 'no'}`,
    `- Write actions enabled: ${draft.safety.write_actions_enabled ? 'yes' : 'no'}`,
    '',
    '## Codex Prompt',
    '',
    draft.codex_prompt,
    '',
    '## GitHub Issue Draft',
    '',
    draft.github_issue_draft,
    '',
    '## Commit Message',
    '',
    '```text',
    draft.commit_message,
    '```',
    '',
    '## Test Commands',
    '',
    ...draft.test_commands.map((command) => `- \`${command}\``)
  ].join('\n');

  assertNoSecretLikeContent(markdown);
  return markdown;
}
