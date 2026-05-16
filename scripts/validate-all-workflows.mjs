#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { validateWorkflowFile } from './validate-n8n-workflow.mjs';

const workflowDir = process.argv[2] || 'workflows';

async function main() {
  const entries = await fs.readdir(workflowDir, { withFileTypes: true });
  const workflowFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(workflowDir, entry.name))
    .sort();

  if (workflowFiles.length === 0) {
    throw new Error(`No workflow JSON files found in ${workflowDir}`);
  }

  let hasErrors = false;
  let hasWarnings = false;

  for (const filePath of workflowFiles) {
    const report = await validateWorkflowFile(filePath);
    console.log(`File: ${filePath}`);
    console.log(`PASS: ${report.pass ? 'YES' : 'NO'}`);

    if (report.warnings.length > 0) {
      hasWarnings = true;
      console.log('WARNINGS:');
      report.warnings.forEach((warning) => console.log(`- ${warning}`));
    } else {
      console.log('WARNINGS:');
      console.log('- none');
    }

    if (report.errors.length > 0) {
      hasErrors = true;
      console.log('ERRORS:');
      report.errors.forEach((error) => console.log(`- ${error}`));
    } else {
      console.log('ERRORS:');
      console.log('- none');
    }

    console.log('');
  }

  console.log(`SUMMARY: ${workflowFiles.length} workflow file(s) checked.`);
  console.log(`WARNINGS PRESENT: ${hasWarnings ? 'YES' : 'NO'}`);
  console.log(`ERRORS PRESENT: ${hasErrors ? 'YES' : 'NO'}`);

  process.exitCode = hasErrors ? 1 : 0;
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});

