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

export function generateActionDraft(record = {}) {
  const runId = safe(record.run_id);
  const taskId = safe(record.task_id);
  const goalSummary = safe(record.goal_summary, 'Review sanitized local agent run.');
  const providerMode = safe(record.provider?.mode);
  const providerName = safe(record.provider?.name);
  const providerStatus = safe(record.provider?.status);
  const riskLevel = safe(record.risk_level, 'low');
  const actionClass = safe(record.action_class, 'read_only');
  const approvalDecision = safe(record.approval_decision?.decision);
  const nextAction = summarizeAction(record);

  const draft = {
    draft_version: 'v0.19-local-action-draft',
    run_id: runId,
    task_id: taskId,
    goal_summary: goalSummary,
    safety: {
      draft_only: true,
      write_actions_enabled: false,
      requires_human_review: true
    },
    codex_prompt: [
      `Review sanitized run ${runId} / ${taskId}.`,
      `Goal summary: ${goalSummary}`,
      `Risk: ${riskLevel}; action class: ${actionClass}; approval decision: ${approvalDecision}.`,
      `Provider: ${providerName} (${providerMode}), status: ${providerStatus}.`,
      'Produce a safe implementation plan or code review. Do not run shell, Git, file-write, or external write actions unless the human explicitly approves them in the active Codex thread.',
      `Requested next action: ${nextAction}`
    ].join('\n'),
    github_issue_draft: [
      `Title: Review local agent run ${runId}`,
      '',
      '## Context',
      goalSummary,
      '',
      '## Safety boundary',
      `- Risk level: ${riskLevel}`,
      `- Action class: ${actionClass}`,
      `- Approval decision: ${approvalDecision}`,
      '- This issue is a draft handoff only and does not authorize automatic write execution.',
      '',
      '## Acceptance criteria',
      '- Confirm the run/task IDs match the intended local review target.',
      '- Confirm no secrets, raw prompts, or raw provider responses are attached.',
      '- Confirm any write-like follow-up remains behind human approval.'
    ].join('\n'),
    commit_message: `chore: review local agent run ${runId}`,
    test_commands: [
      'npm test',
      'npm run workflow:validate:all',
      'npm run demo:local'
    ]
  };

  assertNoSecretLikeContent(JSON.stringify(draft));
  return draft;
}

export function renderActionDraftMarkdown(draft) {
  const markdown = [
    '# Local Action Draft',
    '',
    `- run_id: ${draft.run_id}`,
    `- task_id: ${draft.task_id}`,
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
