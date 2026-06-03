#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { validatePayload } from '../src/utils/validatePayload.js';

const SEND_ENABLED = process.env.DEEPSEEK_SANDBOX_SEND_ENABLED === 'true';
const WRITE_SUMMARY_ENABLED = process.env.DEEPSEEK_SANDBOX_WRITE_SUMMARY === 'true';
const ALLOW_REMOTE = process.env.DEEPSEEK_SANDBOX_ALLOW_REMOTE === 'true';
const WEBHOOK_URL = process.env.N8N_TEST_WEBHOOK_URL || '';
const PROVIDER_BASE_URL = process.env.OPENAI_COMPATIBLE_BASE_URL || 'https://api.deepseek.com';
const PROVIDER_MODEL = process.env.OPENAI_COMPATIBLE_MODEL || 'deepseek-v4-pro';
const CREDENTIAL_NAME = process.env.OPENAI_COMPATIBLE_CREDENTIAL_NAME || 'goald-openai-compatible-readonly';
const SUMMARY_DIR = path.join('.local-audit', 'provider-runs');

const SECRET_PATTERNS = [
  new RegExp(`${'Bear'}er\\s+\\S{8,}`, 'i'),
  /sk-[A-Za-z0-9_-]{12,}/,
  /ghp_[A-Za-z0-9_]{12,}/,
  new RegExp(`${'Author'}ization\\s*:`, 'i'),
  new RegExp(`${'api'}[_-]?${'key'}\\s*[:=]`, 'i')
];

function assertNoSecretLikeContent(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error('DeepSeek sandbox refused secret-like content.');
    }
  }
}

function isLocalUrl(value) {
  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

function buildPayload() {
  return {
    goal: 'Run a DeepSeek read-only sandbox check for the local Agent workflow governance loop.',
    criteria: [
      'Return a structured agent_result contract.',
      'Keep provider output review-oriented and read-only.',
      'Do not enable shell, Git, file-write, deployment, or external write actions.'
    ],
    max_iterations: 1,
    timeout_minutes: 15,
    risk_level: 'low',
    action_class: 'read_only',
    provider_execution: 'provider',
    provider_credential_ready: true,
    context: {
      provider_base_url: PROVIDER_BASE_URL,
      provider_model: PROVIDER_MODEL,
      provider_credential_name: CREDENTIAL_NAME,
      expected_provider_mode: 'real-readonly',
      expected_status: 'needs_review',
      sandbox_boundary: 'read_only_review_only'
    }
  };
}

function buildCurl(payload) {
  if (!WEBHOOK_URL) return null;
  return [
    'curl',
    '-X POST',
    JSON.stringify(WEBHOOK_URL),
    '-H "Content-Type: application/json"',
    `-d '${JSON.stringify(payload)}'`
  ].join(' ');
}

function sanitizeResponse(value) {
  const source = value && typeof value === 'object' ? value : {};
  const agentResult = source.agent_result || source.result || source;
  const provider = agentResult.provider || source.provider || {};
  const safety = agentResult.safety || source.safety || {};

  return {
    status: source.status || agentResult.status || null,
    run_id: source.run_id || agentResult.run_id || null,
    task_id: source.task_id || agentResult.task_id || null,
    agent_result_status: agentResult.status || null,
    provider: {
      mode: provider.mode || null,
      name: provider.name || null,
      model: provider.model || null
    },
    safety: {
      risk_level: safety.risk_level || source.risk_level || null,
      requires_human_approval: safety.requires_human_approval ?? null,
      approved: safety.approved ?? null
    }
  };
}

function buildProviderRunSummary(payload, result = {}) {
  const now = new Date();
  const responseSummary = result.response_summary || {};
  const status = result.ok
    ? responseSummary.agent_result_status || responseSummary.status || 'needs_review'
    : result.error_class === 'approval_blocked'
      ? 'blocked'
    : result.error_class === 'timeout'
      ? 'timeout'
      : 'failed';

  return {
    summary_version: 'v0.16-provider-run-summary',
    run_id: responseSummary.run_id || `gd_deepseek_${now.toISOString().replace(/[^A-Za-z0-9]/g, '').slice(0, 14)}`,
    task_id: responseSummary.task_id || `task_deepseek_${now.toISOString().replace(/[^A-Za-z0-9]/g, '').slice(0, 14)}`,
    provider: {
      mode: 'real-readonly',
      name: 'openai-compatible-readonly',
      model: payload.context.provider_model
    },
    status,
    latency_ms: result.latency_ms || 0,
    score: null,
    error: result.ok
      ? null
      : {
          class: result.error_class || 'provider_error',
          message: result.error_message || 'DeepSeek read-only sandbox did not produce a response.'
        }
  };
}

function writeSummary(summary) {
  if (!WRITE_SUMMARY_ENABLED) {
    return {
      written: false,
      reason: 'provider_summary_write_disabled'
    };
  }

  const validation = validatePayload('providerRunSummary', summary);
  if (!validation.valid) {
    throw new Error(`Provider summary validation failed: ${validation.errors.join('; ')}`);
  }

  const absoluteDir = path.resolve(process.cwd(), SUMMARY_DIR);
  fs.mkdirSync(absoluteDir, { recursive: true });
  const filePath = path.join(absoluteDir, `${summary.run_id}-${summary.task_id}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  return {
    written: true,
    path: path.relative(process.cwd(), filePath)
  };
}

async function postToWebhook(payload) {
  const startedAt = Date.now();
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const latencyMs = Date.now() - startedAt;
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      latency_ms: latencyMs,
      error_class: 'provider_error',
      error_message: `n8n webhook returned HTTP ${response.status}`
    };
  }

  return {
    ok: true,
    latency_ms: latencyMs,
    response_summary: sanitizeResponse(parsed)
  };
}

const payload = buildPayload();
assertNoSecretLikeContent(payload);

if (SEND_ENABLED && !WEBHOOK_URL) {
  throw new Error('N8N_TEST_WEBHOOK_URL is required when DEEPSEEK_SANDBOX_SEND_ENABLED=true.');
}

if (SEND_ENABLED && !ALLOW_REMOTE && !isLocalUrl(WEBHOOK_URL)) {
  throw new Error('DeepSeek sandbox only posts to localhost by default. Set DEEPSEEK_SANDBOX_ALLOW_REMOTE=true to override intentionally.');
}

const curl = buildCurl(payload);
let runResult = {
  ok: false,
  skipped: true,
  error_class: 'approval_blocked',
  error_message: 'Send disabled. Set DEEPSEEK_SANDBOX_SEND_ENABLED=true after n8n is ready.'
};

if (SEND_ENABLED) {
  runResult = await postToWebhook(payload);
}

const providerSummary = buildProviderRunSummary(payload, runResult);
const writeResult = writeSummary(providerSummary);
const output = {
  ok: !SEND_ENABLED || runResult.ok,
  sent: SEND_ENABLED,
  webhook_configured: Boolean(WEBHOOK_URL),
  provider: {
    base_url: PROVIDER_BASE_URL,
    model: PROVIDER_MODEL,
    credential_name: CREDENTIAL_NAME
  },
  payload,
  curl,
  response_summary: runResult.response_summary || null,
  provider_run_summary: providerSummary,
  write_result: writeResult,
  safety: {
    no_api_key_in_payload: true,
    local_webhook_only_by_default: true,
    read_only_action_class: payload.action_class === 'read_only',
    write_actions_enabled: false
  }
};

assertNoSecretLikeContent(output);
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
process.exit(output.ok ? 0 : 1);
