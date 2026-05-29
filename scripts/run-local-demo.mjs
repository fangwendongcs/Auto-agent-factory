#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const steps = [
  {
    name: 'test suite',
    command: process.execPath,
    args: ['--test'],
    env: {
      LOCAL_DEMO_CHILD: 'true'
    }
  },
  {
    name: 'workflow validation',
    command: process.execPath,
    args: ['scripts/validate-all-workflows.mjs', 'workflows']
  },
  {
    name: 'audit report',
    command: process.execPath,
    args: ['scripts/generate-audit-review-report.mjs', 'examples/audit-replay/v08f-read-only-run-record.json']
  },
  {
    name: 'human sign-off review',
    command: process.execPath,
    args: ['scripts/generate-human-signoff-review.mjs', 'examples/audit-replay/v08f-read-only-run-record.json']
  },
  {
    name: 'local review cycle replay',
    command: process.execPath,
    args: ['scripts/replay-local-review-cycle.mjs'],
    env: {
      V012_REPLAY_ID: process.env.V013_DEMO_ID || `v013_${new Date().toISOString().replace(/[^A-Za-z0-9]/g, '').slice(0, 14)}`
    }
  }
];

function runStep(step) {
  process.stdout.write(`\n## Local demo step: ${step.name}\n\n`);
  const result = spawnSync(step.command, step.args, {
    cwd: repoRoot,
    env: { ...process.env, ...(step.env || {}) },
    encoding: 'utf8',
    shell: false
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    process.stderr.write(`${JSON.stringify({
      ok: false,
      failed_step: step.name,
      exit_code: result.status
    }, null, 2)}\n`);
    process.exit(result.status || 1);
  }
}

process.stdout.write('# Auto Agent Factory Local Demo\n');
process.stdout.write('This local demo is repo-side only. It does not connect to n8n runtime or call real providers.\n');

for (const step of steps) {
  runStep(step);
}

process.stdout.write('\n# Local demo completed\n');
process.stdout.write('Artifacts, if generated, are under .local-audit/ and ignored by Git.\n');
