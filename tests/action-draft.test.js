import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { generateActionDraft, renderActionDraftMarkdown } from '../src/utils/generateActionDraft.js';
import { validatePayload } from '../src/utils/validatePayload.js';

const sampleAuditRecord = JSON.parse(
  fs.readFileSync('examples/audit-replay/v08f-read-only-run-record.json', 'utf8')
);
const sampleRejectedDecision = JSON.parse(
  fs.readFileSync('examples/action-drafts/sample_v018_rejected_decision_record.json', 'utf8')
);
const scriptPath = path.resolve('scripts/generate-action-draft.mjs');

function runNode(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: 'utf8'
  });
}

test('generateActionDraft creates a valid draft-only handoff package', () => {
  const draft = generateActionDraft(sampleAuditRecord);
  const validation = validatePayload('actionDraft', draft);

  assert.equal(validation.valid, true);
  assert.equal(draft.source_type, 'audit_record');
  assert.equal(draft.run_id, sampleAuditRecord.run_id);
  assert.equal(draft.human_decision, 'not_recorded');
  assert.equal(draft.handoff_status, 'draft_for_review');
  assert.equal(draft.safety.draft_only, true);
  assert.equal(draft.safety.write_actions_enabled, false);
  assert.ok(draft.codex_prompt.includes('Do not run shell, Git, file-write'));
  assert.deepEqual(draft.test_commands, [
    'npm test',
    'npm run workflow:validate:all',
    'npm run demo:local',
    'npm run approval:console'
  ]);
});

test('generateActionDraft converts a V0.18 rejected decision into a blocked handoff draft', () => {
  const draft = generateActionDraft(sampleRejectedDecision);
  const validation = validatePayload('actionDraft', draft);
  const markdown = renderActionDraftMarkdown(draft);

  assert.equal(validation.valid, true, validation.errors.join('; '));
  assert.equal(draft.source_type, 'human_signoff_decision');
  assert.equal(draft.human_decision, 'rejected');
  assert.equal(draft.handoff_status, 'blocked_rejected');
  assert.equal(draft.safety.draft_only, true);
  assert.equal(draft.safety.write_actions_enabled, false);
  assert.match(draft.codex_prompt, /do not implement/i);
  assert.match(draft.github_issue_draft, /Decision: rejected/);
  assert.match(draft.github_issue_draft, /does not execute workflow actions/);
  assert.match(markdown, /Handoff status: blocked_rejected/);
});

test('action draft CLI accepts sanitized human sign-off decision records', () => {
  const result = runNode(['examples/action-drafts/sample_v018_rejected_decision_record.json']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /# Local Action Draft/);
  assert.match(result.stdout, /source_type: human_signoff_decision/);
  assert.match(result.stdout, /Human decision: rejected/);
  assert.match(result.stdout, /Write actions enabled: no/);
});

test('renderActionDraftMarkdown keeps the handoff reviewable', () => {
  const draft = generateActionDraft(sampleAuditRecord);
  const markdown = renderActionDraftMarkdown(draft);

  assert.match(markdown, /# Local Action Draft/);
  assert.match(markdown, /## Codex Prompt/);
  assert.match(markdown, /## GitHub Issue Draft/);
  assert.match(markdown, /Write actions enabled: no/);
});

test('generateActionDraft refuses secret-like content', () => {
  assert.throws(
    () => generateActionDraft({
      ...sampleAuditRecord,
      goal_summary: 'Use Authorization: Bearer should-not-be-here'
    }),
    /secret-like content/
  );
});
