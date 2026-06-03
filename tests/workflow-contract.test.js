import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflowFiles = [
  'workflows/goal_driven_master.workflow.json',
  'workflows/agent_task_executor.workflow.json',
  'workflows/criteria_checker.workflow.json',
  'workflows/error_handler.workflow.json'
];

function readWorkflow(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function flattenEdges(connections = {}) {
  const edges = [];

  for (const [source, groups] of Object.entries(connections)) {
    for (const outputGroups of Object.values(groups || {})) {
      for (const group of outputGroups || []) {
        for (const edge of group || []) {
          edges.push({ from: source, to: edge.node });
        }
      }
    }
  }

  return edges;
}

test('all exported workflow files are valid inactive JSON workflows', () => {
  for (const filePath of workflowFiles) {
    const workflow = readWorkflow(filePath);

    assert.equal(typeof workflow.name, 'string');
    assert.equal(Array.isArray(workflow.nodes), true);
    assert.equal(typeof workflow.connections, 'object');
    assert.equal(typeof workflow.settings, 'object');
    assert.equal(workflow.active, false);
  }
});

test('workflow connections only target existing nodes', () => {
  for (const filePath of workflowFiles) {
    const workflow = readWorkflow(filePath);
    const nodeNames = new Set(workflow.nodes.map((node) => node.name));

    for (const edge of flattenEdges(workflow.connections)) {
      assert.equal(
        nodeNames.has(edge.to),
        true,
        `${filePath} references missing target node ${edge.to}`
      );
    }
  }
});

test('master workflow exposes required orchestration nodes', () => {
  const master = readWorkflow('workflows/goal_driven_master.workflow.json');
  const names = new Set(master.nodes.map((node) => node.name));

  for (const expectedNode of [
    'Webhook Trigger',
    'Payload Validator',
    'Task Initializer',
    'Agent Dispatcher',
    'Criteria Router',
    'Final Reporter',
    'Response Node'
  ]) {
    assert.equal(names.has(expectedNode), true, `missing ${expectedNode}`);
  }
});

test('executor and checker are shaped as sub-workflows', () => {
  const executor = readWorkflow('workflows/agent_task_executor.workflow.json');
  const checker = readWorkflow('workflows/criteria_checker.workflow.json');

  assert.equal(
    executor.nodes.some((node) => node.type === 'n8n-nodes-base.executeWorkflowTrigger'),
    true
  );
  assert.equal(
    checker.nodes.some((node) => node.type === 'n8n-nodes-base.executeWorkflowTrigger'),
    true
  );
});

test('error handler starts with an Error Trigger', () => {
  const errorWorkflow = readWorkflow('workflows/error_handler.workflow.json');

  assert.equal(errorWorkflow.nodes[0].type, 'n8n-nodes-base.errorTrigger');
});



test('executor provider request asks for criterion-indexed evidence', () => {
  const executor = readWorkflow('workflows/agent_task_executor.workflow.json');
  const requestBuilder = executor.nodes.find(
    (node) => node.name === 'OpenAI-compatible Provider Request Builder'
  );

  assert.ok(requestBuilder, 'missing OpenAI-compatible Provider Request Builder');

  const jsCode = requestBuilder.parameters.jsCode;

  assert.match(jsCode, /criteriaItems/);
  assert.match(jsCode, /criterion_id/);
  assert.match(jsCode, /v0\.6b-criterion-indexed-evidence/);
  assert.match(jsCode, /Return exactly one evidence item for each criteria_items entry/);
  assert.match(jsCode, /Do not mark a criterion as pass unless/);
});

test('provider response normalizer preserves evaluator-quality evidence fields', () => {
  const executor = readWorkflow('workflows/agent_task_executor.workflow.json');
  const normalizer = executor.nodes.find(
    (node) => node.name === 'Provider Response Normalizer'
  );

  assert.ok(normalizer, 'missing Provider Response Normalizer');

  const jsCode = normalizer.parameters.jsCode;

  assert.match(jsCode, /normalizeConfidence/);
  assert.match(jsCode, /supports_fields/);
  assert.match(jsCode, /limitations/);
  assert.match(jsCode, /criterion_id/);
  assert.match(jsCode, /provider_evidence_missing/);
});

test('master payload validator returns structured approval decision for allowed read-only work', () => {
  const master = readWorkflow('workflows/goal_driven_master.workflow.json');
  const validator = master.nodes.find((node) => node.name === 'Payload Validator');
  const runValidator = new Function('$json', validator.parameters.jsCode);

  const result = runValidator({
    goal: 'Review a workflow plan',
    criteria: ['Return a structured review'],
    risk_level: 'low',
    action_class: 'read_only'
  })[0].json;

  assert.equal(result.status, 'validated');
  assert.equal(result.action_class, 'read_only');
  assert.equal(result.approval_decision.decision, 'allow');
  assert.equal(result.approval_decision.blocked, false);
});

test('master payload validator blocks high-risk work without explicit approval', () => {
  const master = readWorkflow('workflows/goal_driven_master.workflow.json');
  const validator = master.nodes.find((node) => node.name === 'Payload Validator');
  const runValidator = new Function('$json', validator.parameters.jsCode);

  const result = runValidator({
    goal: 'Modify production automation workflow without review',
    criteria: ['Must not proceed without human approval'],
    risk_level: 'high',
    action_class: 'repo_write',
    human_approved: false
  })[0].json;

  assert.equal(result.status, 'needs_human_approval');
  assert.equal(result.approval_decision.decision, 'needs_human_approval');
  assert.equal(result.approval_decision.requires_human_approval, true);
  assert.equal(result.approval_decision.approved, false);
  assert.equal(result.approval_decision.blocked, true);
});

test('master payload validator rejects forbidden action classes before executor dispatch', () => {
  const master = readWorkflow('workflows/goal_driven_master.workflow.json');
  const validator = master.nodes.find((node) => node.name === 'Payload Validator');
  const runValidator = new Function('$json', validator.parameters.jsCode);

  const result = runValidator({
    goal: 'Run a shell command to modify the project',
    criteria: ['Must be rejected before execution'],
    risk_level: 'high',
    action_class: 'shell_command',
    human_approved: true
  })[0].json;

  assert.equal(result.status, 'forbidden_request');
  assert.equal(result.approval_decision.decision, 'forbidden');
  assert.equal(result.forbidden_action_detected, true);
  assert.equal(result.approval_decision.blocked, true);
  assert.equal(result.approval_decision.approved, false);
  assert.equal(result.human_approved, false);
});

test('master blocked response includes approval decision contract', () => {
  const master = readWorkflow('workflows/goal_driven_master.workflow.json');
  const blockedBuilder = master.nodes.find((node) => node.name === 'Blocked Response Builder');
  const runBlockedBuilder = new Function('$json', blockedBuilder.parameters.jsCode);

  const result = runBlockedBuilder({
    status: 'forbidden_request',
    validation_errors: [],
    risk_level: 'high',
    action_class: 'shell_command',
    permission_level: 'forbidden',
    forbidden_action_detected: true,
    approval_decision: {
      decision: 'forbidden',
      risk_level: 'high',
      action_class: 'shell_command',
      permission_level: 'forbidden',
      requires_human_approval: true,
      approved: true,
      blocked: true,
      reason: 'Shell command execution is forbidden before a controlled execution adapter exists.'
    }
  })[0].json;

  assert.equal(result.status, 'forbidden_request');
  assert.equal(result.approval_decision.decision, 'forbidden');
  assert.equal(result.approval_decision.blocked, true);
  assert.equal(result.note, 'Forbidden action rejected before task initialization.');
});

test('executor provider aliases normalize to real-readonly provider execution', () => {
  const executor = readWorkflow('workflows/agent_task_executor.workflow.json');
  const promptBuilder = executor.nodes.find((node) => node.name === 'Prompt Builder');
  const runPromptBuilder = new Function('$json', promptBuilder.parameters.jsCode);

  const baseInput = {
    run_id: 'gd_test_provider',
    task_id: 'task_test_provider',
    goal: 'Generate read-only provider evidence',
    criteria: ['Return evidence'],
    iteration: 1,
    instruction: 'Read-only provider call only',
    status: 'validated',
    risk_level: 'low',
    human_approved: true,
    provider_credential_ready: true,
    context: {
      provider_base_url: 'https://api.deepseek.com',
      provider_model: 'deepseek-v4-pro',
      provider_credential_name: 'goald-openai-compatible-readonly',
    },
  };

  for (const patch of [
    { provider_execution: 'provider' },
    { provider_mode: 'provider' },
    { requested_provider_mode: 'provider' },
    { agent_mode: 'provider' },
    { context: { provider_mode: 'provider' } },
    { context: { agent_mode: 'provider' } },
  ]) {
    const input = {
      ...baseInput,
      ...patch,
      context: {
        ...baseInput.context,
        ...(patch.context || {}),
      },
    };
    const result = runPromptBuilder(input)[0].json;

    assert.equal(result.provider_mode, 'real-readonly');
    assert.equal(result.agent_mode, 'real-readonly');
    assert.equal(result.provider_execution, 'provider');
    assert.equal(result.context.provider_mode, 'real-readonly');
    assert.equal(result.context.agent_mode, 'real-readonly');
    assert.equal(result.context.provider_execution, 'provider');
    assert.deepEqual(result.mode_warnings, []);
  }
});

test('executor mode router provider path connects to provider request path and mock remains fallback', () => {
  const executor = readWorkflow('workflows/agent_task_executor.workflow.json');

  const modeRouterConnections = executor.connections['Mode Router'].main;
  assert.equal(modeRouterConnections[0][0].node, 'Real-readonly Provider Selector');
  assert.equal(modeRouterConnections[1][0].node, 'Dry-run Provider Adapter');
  assert.equal(modeRouterConnections[2][0].node, 'Mock Agent Adapter');

  const selectorConnections = executor.connections['Real-readonly Provider Selector'].main;
  assert.equal(selectorConnections[0][0].node, 'Resolve Provider Runtime Config');
  assert.equal(selectorConnections[1][0].node, 'Real-readonly Provider Adapter');

  const requestPath = [
    ['Resolve Provider Runtime Config', 'Real-readonly Safety Check'],
    ['Real-readonly Safety Check', 'OpenAI-compatible Provider Request Builder'],
    ['OpenAI-compatible Provider Request Builder', 'OpenAI-compatible Provider Call Router'],
    ['OpenAI-compatible Provider Call Router', 'OpenAI-compatible HTTP Request'],
    ['OpenAI-compatible HTTP Request', 'OpenAI-compatible Response Envelope'],
    ['OpenAI-compatible Response Envelope', 'Provider Response Normalizer'],
    ['Provider Response Normalizer', 'Result Normalizer'],
  ];
  const edges = flattenEdges(executor.connections);

  for (const [from, to] of requestPath) {
    assert.equal(
      edges.some((edge) => edge.from === from && edge.to === to),
      true,
      `${from} should connect to ${to}`
    );
  }
});

test('executor mock mode still resolves to mock adapter route', () => {
  const executor = readWorkflow('workflows/agent_task_executor.workflow.json');
  const promptBuilder = executor.nodes.find((node) => node.name === 'Prompt Builder');
  const runPromptBuilder = new Function('$json', promptBuilder.parameters.jsCode);

  const result = runPromptBuilder({
    run_id: 'gd_test_mock',
    task_id: 'task_test_mock',
    goal: 'Run mock only',
    criteria: ['Return mock result'],
    iteration: 1,
    instruction: 'Mock path',
    status: 'validated',
    agent_mode: 'mock',
  })[0].json;

  assert.equal(result.provider_mode, 'mock');
  assert.equal(result.agent_mode, 'mock');
  assert.equal(result.provider_execution, undefined);
  assert.equal(result.context.provider_execution, undefined);
});

test('master payload validator preserves provider runtime config and credential readiness flag', () => {
  const master = readWorkflow('workflows/goal_driven_master.workflow.json');
  const validator = master.nodes.find((node) => node.name === 'Payload Validator');
  const runValidator = new Function('$json', validator.parameters.jsCode);

  const result = runValidator({
    goal: 'Generate read-only provider evidence',
    criteria: [{ criterion: 'Return provider evidence without writing files' }],
    provider_execution: 'provider',
    provider_mode: 'provider',
    provider_credential_ready: true,
    context: {
      provider_base_url: 'https://api.deepseek.com',
      provider_model: 'deepseek-v4-pro',
      provider_credential_name: 'goald-openai-compatible-readonly',
    },
    risk_level: 'low',
    action_class: 'read_only',
    human_approved: true,
  })[0].json;

  assert.equal(result.status, 'validated');
  assert.equal(result.provider_execution, 'provider');
  assert.equal(result.provider_mode, 'provider');
  assert.equal(result.provider_credential_ready, true);
  assert.equal(result.provider_base_url, 'https://api.deepseek.com');
  assert.equal(result.provider_model, 'deepseek-v4-pro');
  assert.equal(result.provider_credential_name, 'goald-openai-compatible-readonly');
  assert.deepEqual(result.criteria, ['Return provider evidence without writing files']);
  assert.notEqual(result.criteria[0], '[object Object]');
});

test('executor task validator normalizes criteria objects without [object Object]', () => {
  const executor = readWorkflow('workflows/agent_task_executor.workflow.json');
  const validator = executor.nodes.find((node) => node.name === 'Task Validator');
  const runValidator = new Function('$json', validator.parameters.jsCode);

  const result = runValidator({
    run_id: 'gd_test_criteria',
    task_id: 'task_test_criteria',
    goal: 'Normalize criteria',
    criteria: [
      { criterion: 'Criterion field wins' },
      { description: 'Description fallback works' },
    ],
    iteration: 1,
    instruction: 'Validate only',
    status: 'validated',
  })[0].json;

  assert.deepEqual(result.validation_errors, []);
  assert.deepEqual(result.criteria, ['Criterion field wins', 'Description fallback works']);
  assert.equal(result.criteria.includes('[object Object]'), false);
});

test('workflow JSON does not contain literal bearer or sk-like secrets', () => {
  for (const filePath of workflowFiles) {
    const raw = fs.readFileSync(filePath, 'utf8');
    assert.equal(/Bearer\s+[A-Za-z0-9._~+/=-]{20,}/.test(raw), false, `${filePath} contains a Bearer-like token`);
    assert.equal(/sk-[A-Za-z0-9_-]{20,}/.test(raw), false, `${filePath} contains an sk-like token`);
  }
});
