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
