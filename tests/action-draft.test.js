import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { generateActionDraft, renderActionDraftMarkdown } from '../src/utils/generateActionDraft.js';
import { validatePayload } from '../src/utils/validatePayload.js';

const sampleAuditRecord = JSON.parse(
  fs.readFileSync('examples/audit-replay/v08f-read-only-run-record.json', 'utf8')
);

test('generateActionDraft creates a valid draft-only handoff package', () => {
  const draft = generateActionDraft(sampleAuditRecord);
  const validation = validatePayload('actionDraft', draft);

  assert.equal(validation.valid, true);
  assert.equal(draft.run_id, sampleAuditRecord.run_id);
  assert.equal(draft.safety.draft_only, true);
  assert.equal(draft.safety.write_actions_enabled, false);
  assert.ok(draft.codex_prompt.includes('Do not run shell, Git, file-write'));
  assert.deepEqual(draft.test_commands, [
    'npm test',
    'npm run workflow:validate:all',
    'npm run demo:local'
  ]);
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
