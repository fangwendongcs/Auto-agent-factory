#!/usr/bin/env node

import fs from 'node:fs/promises';

const expectedWorkflows = {
  'workflows/agent_task_executor.workflow.json': {
    name: '[GoalDriven] 02 Agent Task Executor',
    requiredNodes: [
      'When Executed by Another Workflow',
      'Task Validator',
      'Prompt Builder',
      'Mock Agent Adapter',
      'Execution Logger'
    ]
  },
  'workflows/criteria_checker.workflow.json': {
    name: '[GoalDriven] 03 Criteria Checker',
    requiredNodes: [
      'When Executed by Another Workflow',
      'Criteria Evaluator',
      'Checker Prompt Reference'
    ]
  },
  'workflows/error_handler.workflow.json': {
    name: '[GoalDriven] 04 Error Handler',
    requiredNodes: [
      'Error Trigger',
      'Error Normalizer',
      'Recovery Advisor'
    ]
  },
  'workflows/goal_driven_master.workflow.json': {
    name: '[GoalDriven] 01 Master',
    requiredNodes: [
      'Webhook Trigger',
      'Payload Validator',
      'Approval or Invalid Router',
      'Task Initializer',
      'Agent Dispatcher',
      "Call '[GoalDriven] 02 Agent Task Executor'",
      'Criteria Router',
      "Call '[GoalDriven] 03 Criteria Checker'",
      'Criteria Met Router',
      'Final Reporter'
    ],
    linkedWorkflowNodes: [
      "Call '[GoalDriven] 02 Agent Task Executor'",
      "Call '[GoalDriven] 03 Criteria Checker'"
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

    if (expectation.linkedWorkflowNodes) {
      console.log(`Linked sub-workflow nodes: ${expectation.linkedWorkflowNodes.join(', ')}`);
    }

    console.log('');
  }

  console.log('Expected import order:');
  Object.keys(expectedWorkflows).forEach((filePath, index) => {
    console.log(`${index + 1}. ${filePath}`);
  });

  console.log('');
  console.log('Bindings to verify after import:');
  console.log("- Master → [GoalDriven] 02 Agent Task Executor");
  console.log("- Master → [GoalDriven] 03 Criteria Checker");
  console.log("- Master error workflow → [GoalDriven] 04 Error Handler");
  console.log('- Same-instance re-import can keep exported IDs; cross-instance import requires manual reselection.');

  process.exitCode = hasErrors ? 1 : 0;
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
