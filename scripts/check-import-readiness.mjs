#!/usr/bin/env node

import fs from 'node:fs/promises';

const expectedWorkflows = {
  'workflows/agent_task_executor.workflow.json': {
    name: 'Agent Task Executor Workflow',
    requiredNodes: [
      'When Executed by Another Workflow',
      'Task Validator',
      'Prompt Builder',
      'Mock Agent Adapter',
      'Execution Logger'
    ]
  },
  'workflows/criteria_checker.workflow.json': {
    name: 'Criteria Checker Workflow',
    requiredNodes: [
      'When Executed by Another Workflow',
      'Criteria Evaluator',
      'Checker Prompt Reference'
    ]
  },
  'workflows/error_handler.workflow.json': {
    name: 'Goal-Driven Error Handler Workflow',
    requiredNodes: [
      'Error Trigger',
      'Error Normalizer',
      'Recovery Advisor'
    ]
  },
  'workflows/goal_driven_master.workflow.json': {
    name: 'Goal-Driven Master Workflow',
    requiredNodes: [
      'Webhook Trigger',
      'Payload Validator',
      'Task Initializer',
      'Agent Dispatcher',
      'Mock Executor Result',
      'Criteria Router',
      'Final Reporter'
    ],
    placeholderNodes: [
      'Agent Dispatcher',
      'Criteria Router'
    ]
  }
};

async function main() {
  let hasErrors = false;

  for (const [filePath, expectation] of Object.entries(expectedWorkflows)) {
    const workflow = JSON.parse(await fs.readFile(filePath, 'utf8'));
    const nodeNames = new Set(workflow.nodes.map((node) => node.name));
    const missingNodes = expectation.requiredNodes.filter((node) => !nodeNames.has(node));

    console.log(`Workflow: ${expectation.name}`);
    console.log(`File: ${filePath}`);
    console.log(`Inactive: ${workflow.active === false ? 'YES' : 'NO'}`);
    console.log(`Required nodes present: ${missingNodes.length === 0 ? 'YES' : 'NO'}`);

    if (missingNodes.length > 0) {
      hasErrors = true;
      missingNodes.forEach((node) => console.log(`- missing node: ${node}`));
    }

    if (expectation.placeholderNodes) {
      console.log(`Manual wiring placeholders: ${expectation.placeholderNodes.join(', ')}`);
    }

    console.log('');
  }

  console.log('Expected import order:');
  Object.keys(expectedWorkflows).forEach((filePath, index) => {
    console.log(`${index + 1}. ${filePath}`);
  });

  console.log('');
  console.log('Manual wiring required after import:');
  console.log('- Master → Agent Task Executor Workflow');
  console.log('- Master → Criteria Checker Workflow');
  console.log('- Master error workflow → Goal-Driven Error Handler Workflow');

  process.exitCode = hasErrors ? 1 : 0;
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});

