#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { generateActionDraft, renderActionDraftMarkdown } from '../src/utils/generateActionDraft.js';
import { validatePayload } from '../src/utils/validatePayload.js';

function printError(value) {
  process.stderr.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  return {
    usage: 'node scripts/generate-action-draft.mjs <sanitized-audit-record.json>',
    output: 'Markdown action draft to stdout',
    safety: [
      'reads sanitized audit records only',
      'does not connect to n8n runtime',
      'does not run shell commands',
      'does not modify Git',
      'does not write files',
      'does not execute external write actions'
    ]
  };
}

const inputPath = process.argv[2];

if (!inputPath || inputPath === '--help' || inputPath === '-h') {
  if (inputPath) {
    process.stdout.write(`${JSON.stringify(usage(), null, 2)}\n`);
    process.exit(0);
  }
  printError(usage());
  process.exit(1);
}

try {
  const absoluteInputPath = path.resolve(process.cwd(), inputPath);
  const record = JSON.parse(fs.readFileSync(absoluteInputPath, 'utf8'));
  const auditValidation = validatePayload('auditRecord', record);

  if (!auditValidation.valid) {
    printError({
      ok: false,
      reason: 'action_draft_input_validation_failed',
      errors: auditValidation.errors
    });
    process.exit(1);
  }

  const draft = generateActionDraft(record);
  const draftValidation = validatePayload('actionDraft', draft);

  if (!draftValidation.valid) {
    printError({
      ok: false,
      reason: 'action_draft_contract_validation_failed',
      errors: draftValidation.errors
    });
    process.exit(1);
  }

  process.stdout.write(`${renderActionDraftMarkdown(draft)}\n`);
} catch (error) {
  printError({
    ok: false,
    reason: 'action_draft_generation_failed',
    error: error.message
  });
  process.exit(1);
}
