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
