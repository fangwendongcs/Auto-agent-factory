import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPaths = {
  goal: path.resolve(__dirname, '../schema/goal.schema.json'),
  task: path.resolve(__dirname, '../schema/task.schema.json'),
  result: path.resolve(__dirname, '../schema/result.schema.json'),
  auditRecord: path.resolve(__dirname, '../schema/audit-record.schema.json')
};

function readSchema(kind) {
  if (!schemaPaths[kind]) {
    throw new Error(`Unknown schema kind: ${kind}`);
  }

  return JSON.parse(fs.readFileSync(schemaPaths[kind], 'utf8'));
}

function matchesType(value, type) {
  switch (type) {
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'integer':
      return Number.isInteger(value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'null':
      return value === null;
    default:
      return true;
  }
}

function validateAgainstSchema(value, schema, trail = '$') {
  const errors = [];
  const allowedTypes = Array.isArray(schema.type)
    ? schema.type
    : schema.type
      ? [schema.type]
      : [];

  if (allowedTypes.length > 0 && !allowedTypes.some((type) => matchesType(value, type))) {
    return [`${trail}: expected ${allowedTypes.join(' | ')}`];
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${trail}: expected one of ${schema.enum.join(', ')}`);
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${trail}: expected string length >= ${schema.minLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${trail}: expected string to match ${schema.pattern}`);
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${trail}: expected value >= ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${trail}: expected value <= ${schema.maximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${trail}: expected at least ${schema.minItems} item(s)`);
    }

    if (schema.uniqueItems) {
      const serialized = value.map((item) => JSON.stringify(item));
      if (new Set(serialized).size !== serialized.length) {
        errors.push(`${trail}: expected unique items`);
      }
    }

    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(...validateAgainstSchema(item, schema.items, `${trail}[${index}]`));
      });
    }
  }

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const properties = schema.properties || {};
    const required = schema.required || [];

    required.forEach((key) => {
      if (!(key in value)) {
        errors.push(`${trail}: missing required field ${key}`);
      }
    });

    if (schema.additionalProperties === false) {
      Object.keys(value).forEach((key) => {
        if (!(key in properties)) {
          errors.push(`${trail}: unexpected field ${key}`);
        }
      });
    }

    Object.entries(value).forEach(([key, nestedValue]) => {
      if (properties[key]) {
        errors.push(...validateAgainstSchema(nestedValue, properties[key], `${trail}.${key}`));
      }
    });
  }

  return errors;
}

export function validatePayload(kind, payload) {
  const schema = readSchema(kind);
  const errors = validateAgainstSchema(payload, schema);

  return {
    valid: errors.length === 0,
    errors
  };
}

export function assertValidPayload(kind, payload) {
  const result = validatePayload(kind, payload);

  if (!result.valid) {
    throw new Error(`${kind} payload validation failed: ${result.errors.join('; ')}`);
  }

  return payload;
}

