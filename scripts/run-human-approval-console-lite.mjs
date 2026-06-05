#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  appendHumanApprovalConsoleDecision,
  createHumanApprovalConsoleDecision,
  normalizeHumanApprovalReviewItem,
  renderHumanApprovalConsole
} from '../src/utils/humanApprovalConsoleLite.js';

function printError(value) {
  process.stderr.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  return {
    usage: 'node scripts/run-human-approval-console-lite.mjs <review-input.json> [decision-input.json]',
    output: 'Local human approval console markdown to stdout; optional sanitized decision JSON and dev-only ledger write',
    decisions: ['approved', 'rejected', 'needs_review'],
    safety: [
      'reads sanitized recovery or high-risk review inputs only',
      'does not connect to n8n runtime',
      'does not retry automatically',
      'does not approve automatically',
      'does not run shell commands',
      'does not modify Git',
      'does not execute file, deployment, or external write actions',
      'writes only to .local-audit/signoff-ledger/*.jsonl when SIGNOFF_LEDGER_WRITE_ENABLED=true'
    ]
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8'));
}

const reviewInputPath = process.argv[2];
const decisionInputPath = process.argv[3];

if (!reviewInputPath || reviewInputPath === '--help' || reviewInputPath === '-h') {
  if (reviewInputPath) {
    process.stdout.write(`${JSON.stringify(usage(), null, 2)}\n`);
    process.exit(0);
  }
  printError(usage());
  process.exit(1);
}

try {
  const reviewInput = readJson(reviewInputPath);

  if (!decisionInputPath) {
    const reviewItem = normalizeHumanApprovalReviewItem(reviewInput);
    process.stdout.write(`${renderHumanApprovalConsole(reviewItem)}\n`);
    process.exit(0);
  }

  const decisionInput = readJson(decisionInputPath);
  const { review_item: reviewItem, decision_record: decisionRecord } =
    createHumanApprovalConsoleDecision(reviewInput, decisionInput);
  const writeResult = appendHumanApprovalConsoleDecision(decisionRecord, {
    env: process.env,
    cwd: process.cwd()
  });

  process.stdout.write(`${renderHumanApprovalConsole(reviewItem, decisionRecord, writeResult)}\n`);
  process.stdout.write('\n## Decision Record JSON\n\n');
  process.stdout.write(`\`\`\`json\n${JSON.stringify(decisionRecord, null, 2)}\n\`\`\`\n`);

  if (writeResult.written) {
    process.stderr.write(`${JSON.stringify({
      ok: true,
      written: true,
      path: writeResult.path,
      bytes: writeResult.bytes
    }, null, 2)}\n`);
  }
} catch (error) {
  printError({
    ok: false,
    reason: 'human_approval_console_failed',
    error: error.message
  });
  process.exit(1);
}
