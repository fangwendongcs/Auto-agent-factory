import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  generateHumanSignoffReview,
  getRecommendedSignoffDecision,
  writeHumanSignoffReviewArtifact
} from '../src/utils/generateHumanSignoffReview.js';

const scriptPath = path.resolve('scripts/generate-human-signoff-review.mjs');
const sampleRecordPath = path.resolve('examples/sample_sanitized_run_record.json');
const replayRecordPath = path.resolve('examples/audit-replay/v08f-read-only-run-record.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env || {}) },
    encoding: 'utf8'
  });
}

test('human sign-off review renders safe read-only package with checklist', () => {
  const record = readJson(replayRecordPath);
  const review = generateHumanSignoffReview(record);
  const recommendation = getRecommendedSignoffDecision(record);

  assert.equal(recommendation.decision, 'needs_review');
  assert.match(review, /^# Human Sign-off Review Package/m);
  assert.match(review, /run_id: gd_v08f_replay_001/);
  assert.match(review, /task_id: task_v08f_replay_001/);
  assert.match(review, /Recommended decision: needs_review/);
  assert.match(review, /Human Checklist/);
  assert.match(review, /Sign-off Block/);
});

test('human sign-off recommends reject for forbidden actions', () => {
  const record = {
    ...readJson(sampleRecordPath),
    run_id: 'gd_signoff_forbidden_001',
    task_id: 'task_signoff_forbidden_001',
    status: 'forbidden_request',
    risk_level: 'high',
    action_class: 'shell_command',
    permission_level: 'forbidden',
    approval_decision: {
      decision: 'forbidden',
      blocked: true,
      approved: false,
      requires_human_approval: true,
      reason_summary: 'Forbidden action rejected before task initialization.'
    }
  };

  const recommendation = getRecommendedSignoffDecision(record);
  const review = generateHumanSignoffReview(record);

  assert.equal(recommendation.decision, 'reject');
  assert.match(review, /Recommended decision: reject/);
});

test('human sign-off recommends needs_review for high-risk or write-like actions', () => {
  const highRisk = {
    ...readJson(sampleRecordPath),
    risk_level: 'high',
    action_class: 'read_only',
    permission_level: 'read_only',
    approval_decision: {
      decision: 'needs_human_approval',
      blocked: true,
      approved: false,
      requires_human_approval: true
    }
  };
  const writeLike = {
    ...readJson(sampleRecordPath),
    risk_level: 'medium',
    action_class: 'repo_write',
    permission_level: 'write_action',
    approval_decision: {
      decision: 'needs_human_approval',
      blocked: true,
      approved: false,
      requires_human_approval: true
    }
  };

  assert.equal(getRecommendedSignoffDecision(highRisk).decision, 'needs_review');
  assert.equal(getRecommendedSignoffDecision(writeLike).decision, 'needs_review');
});

test('human sign-off review does not include raw prompt, raw provider response, or secret-like values', () => {
  const record = readJson(replayRecordPath);
  const review = generateHumanSignoffReview(record);

  assert.equal(review.includes('provider_response_raw'), false);
  assert.equal(review.includes('provider_request'), false);
  assert.equal(review.includes(`${'Author'}ization`), false);
  assert.equal(review.includes(`${'Bear'}er`), false);
  assert.equal(review.includes(`${'sk'}-`), false);
});

test('human sign-off CLI writes stdout only by default', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'signoff-default-'));
  const result = runCli([replayRecordPath], { cwd });
  const defaultOutputPath = path.join(cwd, '.local-audit', 'signoff', 'latest-signoff-review.md');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(defaultOutputPath), false);
  assert.match(result.stdout, /^# Human Sign-off Review Package/m);
});

test('human sign-off CLI writes a dev-only markdown artifact when explicitly enabled', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'signoff-enabled-'));
  const outputPath = '.local-audit/signoff/v010-signoff-test.md';
  const result = runCli([replayRecordPath], {
    cwd,
    env: {
      HUMAN_SIGNOFF_WRITE_ENABLED: 'true',
      HUMAN_SIGNOFF_OUTPUT_PATH: outputPath
    }
  });
  const absoluteOutputPath = path.join(cwd, outputPath);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(absoluteOutputPath), true);
  assert.match(fs.readFileSync(absoluteOutputPath, 'utf8'), /^# Human Sign-off Review Package/m);
  assert.match(result.stderr, /"written": true/);
});

test('human sign-off CLI rejects artifact paths outside .local-audit/signoff', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'signoff-outside-'));
  const result = runCli([replayRecordPath], {
    cwd,
    env: {
      HUMAN_SIGNOFF_WRITE_ENABLED: 'true',
      HUMAN_SIGNOFF_OUTPUT_PATH: 'signoff/unsafe.md'
    }
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must stay under \.local-audit\/signoff\//);
});

test('human sign-off CLI rejects non-markdown artifact paths', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'signoff-non-md-'));
  const result = runCli([replayRecordPath], {
    cwd,
    env: {
      HUMAN_SIGNOFF_WRITE_ENABLED: 'true',
      HUMAN_SIGNOFF_OUTPUT_PATH: '.local-audit/signoff/unsafe.txt'
    }
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must be a \.md file/);
});

test('human sign-off artifact writer rejects secret-like review content', () => {
  assert.throws(
    () => writeHumanSignoffReviewArtifact(`safe text\n${'Bear'}er not-a-real-secret-but-denied`, {
      env: {
        HUMAN_SIGNOFF_WRITE_ENABLED: 'true',
        HUMAN_SIGNOFF_OUTPUT_PATH: '.local-audit/signoff/unsafe.md'
      },
      cwd: fs.mkdtempSync(path.join(os.tmpdir(), 'signoff-secret-'))
    }),
    /Human sign-off review refused/
  );
});

test('human sign-off CLI reads JSONL with multiple sanitized records', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'signoff-jsonl-'));
  const first = readJson(replayRecordPath);
  const second = {
    ...first,
    run_id: 'gd_signoff_jsonl_002',
    task_id: 'task_signoff_jsonl_002',
    risk_level: 'high',
    action_class: 'repo_write',
    permission_level: 'write_action',
    approval_decision: {
      decision: 'needs_human_approval',
      blocked: true,
      approved: false,
      requires_human_approval: true
    }
  };
  const jsonlPath = path.join(cwd, 'records.jsonl');
  fs.writeFileSync(jsonlPath, `${JSON.stringify(first)}\n${JSON.stringify(second)}\n`);

  const result = runCli([jsonlPath], { cwd });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Total review items: 2/);
  assert.match(result.stdout, /gd_signoff_jsonl_002/);
  assert.match(result.stdout, /Recommended needs_review: 2/);
});
