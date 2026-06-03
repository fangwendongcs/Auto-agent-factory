#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const offline = args.has('--offline');
const jsonOnly = args.has('--json');
const repoRoot = process.cwd();
const composePath = path.join(repoRoot, 'n8n', 'compose.local.yml');
const workflowsDir = path.join(repoRoot, 'workflows');
const baseUrl = process.env.N8N_BASE_URL || `http://localhost:${process.env.N8N_PORT || '5678'}`;
const timeoutMs = Number.parseInt(process.env.N8N_HEALTH_TIMEOUT_MS || '2500', 10);

const expectedWorkflows = [
  '[GoalDriven] 01 Master',
  '[GoalDriven] 02 Agent Task Executor',
  '[GoalDriven] 03 Criteria Checker',
  '[GoalDriven] 04 Error Handler'
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function checkGitignore() {
  const gitignorePath = path.join(repoRoot, '.gitignore');
  const content = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
  const requiredPatterns = ['.env', '.env.*', '.local-audit/'];

  return requiredPatterns.map((pattern) => ({
    pattern,
    present: content.split('\n').some((line) => line.trim() === pattern)
  }));
}

function checkWorkflowExports() {
  if (!fs.existsSync(workflowsDir)) {
    return {
      ok: false,
      reason: 'workflows_dir_missing',
      workflows: []
    };
  }

  const files = fs.readdirSync(workflowsDir).filter((file) => file.endsWith('.workflow.json'));
  const workflows = files.map((file) => {
    const workflow = readJson(path.join(workflowsDir, file));
    return {
      file,
      name: workflow.name,
      active: workflow.active,
      node_count: Array.isArray(workflow.nodes) ? workflow.nodes.length : 0
    };
  });
  const names = new Set(workflows.map((workflow) => workflow.name));
  const missing = expectedWorkflows.filter((name) => !names.has(name));
  const activeExports = workflows.filter((workflow) => workflow.active !== false);

  return {
    ok: missing.length === 0 && activeExports.length === 0,
    missing,
    active_exports: activeExports.map((workflow) => workflow.name),
    workflows
  };
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      bytes: Buffer.byteLength(text)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkN8nRuntime() {
  if (offline) {
    return {
      checked: false,
      ok: null,
      reason: 'offline_mode'
    };
  }

  const probes = ['/healthz', '/healthz/readiness', '/rest/settings'];
  const attempts = [];

  for (const probe of probes) {
    const url = new URL(probe, baseUrl).toString();
    try {
      const result = await fetchWithTimeout(url);
      attempts.push({ path: probe, ...result });
      if (result.ok) {
        return {
          checked: true,
          ok: true,
          base_url: baseUrl,
          healthy_path: probe,
          attempts
        };
      }
    } catch (error) {
      attempts.push({
        path: probe,
        ok: false,
        error: error.name === 'AbortError' ? 'timeout' : error.message
      });
    }
  }

  return {
    checked: true,
    ok: false,
    base_url: baseUrl,
    attempts
  };
}

function printReport(report) {
  if (jsonOnly) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  process.stdout.write('# Local Runtime Health Check\n\n');
  process.stdout.write(`- compose file: ${report.compose.present ? 'present' : 'missing'}\n`);
  process.stdout.write(`- workflow exports: ${report.workflow_exports.ok ? 'ok' : 'needs attention'}\n`);
  process.stdout.write(`- gitignore safety: ${report.gitignore.ok ? 'ok' : 'needs attention'}\n`);
  process.stdout.write(`- n8n runtime: ${report.n8n_runtime.checked ? (report.n8n_runtime.ok ? 'healthy' : 'unreachable') : 'not checked'}\n`);

  if (report.n8n_runtime.base_url) {
    process.stdout.write(`- n8n base url: ${report.n8n_runtime.base_url}\n`);
  }

  process.stdout.write('\n');
  process.stdout.write(JSON.stringify(report, null, 2));
  process.stdout.write('\n');
}

const workflowExports = checkWorkflowExports();
const gitignoreChecks = checkGitignore();
const report = {
  ok: false,
  mode: offline ? 'offline' : 'online',
  compose: {
    path: 'n8n/compose.local.yml',
    present: fs.existsSync(composePath)
  },
  workflow_exports: workflowExports,
  gitignore: {
    ok: gitignoreChecks.every((check) => check.present),
    required_patterns: gitignoreChecks
  },
  n8n_runtime: await checkN8nRuntime(),
  safety: {
    no_api_key_required: true,
    workflow_json_checked_only: true,
    no_runtime_write_attempted: true
  }
};

report.ok = Boolean(
  report.compose.present &&
  report.workflow_exports.ok &&
  report.gitignore.ok &&
  (offline || report.n8n_runtime.ok)
);

printReport(report);
process.exit(report.ok ? 0 : 1);
