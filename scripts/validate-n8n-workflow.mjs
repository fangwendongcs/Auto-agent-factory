#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const obviousSecretPatterns = [
  { label: 'OpenAI-style token', pattern: /sk-[A-Za-z0-9_-]{20,}/g },
  { label: 'GitHub personal access token', pattern: /ghp_[A-Za-z0-9]{20,}/g },
  { label: 'Slack bot token', pattern: /xoxb-[A-Za-z0-9-]{10,}/g },
  {
    label: 'Bearer token',
    pattern: /Bearer\s+(?!\{\{\s*\$env\.)[A-Za-z0-9._-]{20,}/g
  }
];

const allowedEnvPlaceholder = /^\{\{\s*\$env\.[A-Z0-9_]+\s*\}\}$/;
const suspiciousSecretKey = /^(api[_-]?key|apikey|password)$/i;

function collectSuspiciousPlaintextSecrets(value, trail = []) {
  const findings = [];

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findings.push(...collectSuspiciousPlaintextSecrets(item, [...trail, `[${index}]`]));
    });
    return findings;
  }

  if (value && typeof value === 'object') {
    for (const [key, nestedValue] of Object.entries(value)) {
      const nextTrail = [...trail, key];
      if (
        suspiciousSecretKey.test(key) &&
        typeof nestedValue === 'string' &&
        nestedValue.trim() !== '' &&
        !allowedEnvPlaceholder.test(nestedValue.trim())
      ) {
        findings.push(`Possible plaintext secret at ${nextTrail.join('.')}`);
      }
      findings.push(...collectSuspiciousPlaintextSecrets(nestedValue, nextTrail));
    }
  }

  return findings;
}

function flattenConnections(connections = {}) {
  const edges = [];

  for (const [sourceNode, connectionGroups] of Object.entries(connections)) {
    for (const outputGroups of Object.values(connectionGroups || {})) {
      for (const group of outputGroups || []) {
        for (const edge of group || []) {
          if (edge?.node) {
            edges.push({ from: sourceNode, to: edge.node });
          }
        }
      }
    }
  }

  return edges;
}

export async function validateWorkflowFile(filePath) {
  const report = {
    filePath,
    pass: false,
    warnings: [],
    errors: []
  };

  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    report.errors.push(`Unable to read file: ${error.message}`);
    return report;
  }

  let workflow;
  try {
    workflow = JSON.parse(raw);
  } catch (error) {
    report.errors.push(`Invalid JSON: ${error.message}`);
    return report;
  }

  for (const field of ['name', 'nodes', 'connections', 'settings']) {
    if (!(field in workflow)) {
      report.errors.push(`Missing required top-level field: ${field}`);
    }
  }

  if (!Array.isArray(workflow.nodes)) {
    report.errors.push('nodes must be an array');
  }

  if (
    workflow.connections === null ||
    Array.isArray(workflow.connections) ||
    typeof workflow.connections !== 'object'
  ) {
    report.errors.push('connections must be an object');
  }

  for (const { label, pattern } of obviousSecretPatterns) {
    if (pattern.test(raw)) {
      report.errors.push(`Detected possible secret pattern: ${label}`);
    }
    pattern.lastIndex = 0;
  }

  report.errors.push(...collectSuspiciousPlaintextSecrets(workflow));

  if (workflow.active === true) {
    report.warnings.push('Workflow is active: true. Review before importing or deploying.');
  }

  if (Array.isArray(workflow.nodes) && workflow.connections && typeof workflow.connections === 'object') {
    const nodeNames = new Set(workflow.nodes.map((node) => node.name));
    const edges = flattenConnections(workflow.connections);
    const incoming = new Map([...nodeNames].map((name) => [name, 0]));
    const outgoing = new Map([...nodeNames].map((name) => [name, 0]));

    for (const edge of edges) {
      if (!nodeNames.has(edge.from)) {
        report.errors.push(`Connection source does not exist: ${edge.from}`);
      } else {
        outgoing.set(edge.from, (outgoing.get(edge.from) || 0) + 1);
      }

      if (!nodeNames.has(edge.to)) {
        report.errors.push(`Connection target does not exist: ${edge.to}`);
      } else {
        incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
      }
    }

    for (const nodeName of nodeNames) {
      const inCount = incoming.get(nodeName) || 0;
      const outCount = outgoing.get(nodeName) || 0;
      if (inCount === 0 && outCount === 0) {
        report.warnings.push(`Isolated node detected: ${nodeName}`);
      }
    }
  }

  report.pass = report.errors.length === 0;
  return report;
}

function printReport(report) {
  console.log(`File: ${report.filePath}`);
  console.log(`PASS: ${report.pass ? 'YES' : 'NO'}`);

  console.log('WARNINGS:');
  if (report.warnings.length === 0) {
    console.log('- none');
  } else {
    report.warnings.forEach((warning) => console.log(`- ${warning}`));
  }

  console.log('ERRORS:');
  if (report.errors.length === 0) {
    console.log('- none');
  } else {
    report.errors.forEach((error) => console.log(`- ${error}`));
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === currentFilePath;

if (isDirectRun) {
  const targetPath =
    process.argv[2] || 'n8n/workflows/codex-planner-reviewer.workflow.json';
  const report = await validateWorkflowFile(targetPath);
  printReport(report);
  process.exitCode = report.pass ? 0 : 1;
}

