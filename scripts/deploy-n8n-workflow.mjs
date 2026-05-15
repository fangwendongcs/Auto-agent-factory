#!/usr/bin/env node

import fs from 'node:fs/promises';
import process from 'node:process';
import { validateWorkflowFile } from './validate-n8n-workflow.mjs';

const workflowPath =
  process.argv[2] || 'n8n/workflows/codex-planner-reviewer.workflow.json';

const deployMode = process.env.N8N_DEPLOY_MODE || 'dry-run';
const baseUrl = process.env.N8N_BASE_URL || '';
const apiKey = process.env.N8N_API_KEY || '';
const createEndpoint =
  process.env.N8N_WORKFLOW_CREATE_ENDPOINT || '/api/v1/workflows';

function printValidationSummary(report) {
  console.log(`Validation PASS: ${report.pass ? 'YES' : 'NO'}`);
  if (report.warnings.length > 0) {
    console.log('Validation warnings:');
    report.warnings.forEach((warning) => console.log(`- ${warning}`));
  }
  if (report.errors.length > 0) {
    console.log('Validation errors:');
    report.errors.forEach((error) => console.log(`- ${error}`));
  }
}

async function createWorkflow({ workflow, url, token }) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': token
    },
    body: JSON.stringify({
      ...workflow,
      active: false
    })
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `n8n create workflow request failed with ${response.status}: ${responseText.slice(0, 500)}`
    );
  }

  return responseText ? JSON.parse(responseText) : null;
}

async function main() {
  const validation = await validateWorkflowFile(workflowPath);
  printValidationSummary(validation);

  if (!validation.pass) {
    throw new Error('Deployment stopped because workflow validation failed.');
  }

  const workflow = JSON.parse(await fs.readFile(workflowPath, 'utf8'));

  console.log(`Workflow: ${workflow.name}`);
  console.log(`Deploy mode: ${deployMode}`);
  console.log(`Create endpoint: ${createEndpoint}`);
  console.log('Activation policy: workflow will remain inactive after creation.');

  if (deployMode !== 'apply') {
    console.log('Dry-run only. No n8n API request was sent.');
    return;
  }

  if (!baseUrl) {
    throw new Error('N8N_BASE_URL is required when N8N_DEPLOY_MODE=apply.');
  }
  if (!apiKey) {
    throw new Error('N8N_API_KEY is required when N8N_DEPLOY_MODE=apply.');
  }

  const createUrl = new URL(createEndpoint, baseUrl).toString();
  console.log(`Applying workflow creation request to: ${createUrl}`);

  const createdWorkflow = await createWorkflow({
    workflow,
    url: createUrl,
    token: apiKey
  });

  console.log('Workflow created successfully in inactive mode.');
  if (createdWorkflow?.id) {
    console.log(`Created workflow id: ${createdWorkflow.id}`);
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});

