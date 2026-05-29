import fs from 'node:fs';
import path from 'node:path';
import { validatePayload } from './validatePayload.js';

const APPROVED_AUDIT_DIR = '.local-audit';
const DEFAULT_AUDIT_PATH = '.local-audit/dev-audit-log.jsonl';

const DENYLISTED_KEYS = new Set([
  'prompt',
  'full_prompt',
  'raw_prompt',
  'messages',
  'provider_request',
  'provider_response_raw',
  'provider_response_content',
  'raw_response',
  'authorization',
  'api_key',
  'openai_api_key',
  'n8n_api_key',
  'token',
  'secret',
  'password',
  'credential',
  'cookie',
  'headers',
  'body'
]);

const SECRET_VALUE_PATTERNS = [
  /Bearer\s+\S{8,}/i,
  /sk-[A-Za-z0-9_-]{12,}/,
  /ghp_[A-Za-z0-9_]{12,}/,
  /xoxb-[A-Za-z0-9-]{12,}/,
  /Authorization\s*:/i
];

function isRedactionExcludedFieldsPath(pathParts) {
  return pathParts.length >= 3 &&
    pathParts[0] === 'redaction' &&
    pathParts[1] === 'excluded_fields';
}

function collectUnsafeKeys(value, pathParts = []) {
  if (!value || typeof value !== 'object') {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectUnsafeKeys(item, [...pathParts, String(index)]));
  }

  const unsafe = [];

  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = [...pathParts, key];
    if (DENYLISTED_KEYS.has(key.toLowerCase()) && !isRedactionExcludedFieldsPath(pathParts)) {
      unsafe.push(nextPath.join('.'));
    }
    unsafe.push(...collectUnsafeKeys(nestedValue, nextPath));
  }

  return unsafe;
}

function collectUnsafeStringValues(value, pathParts = []) {
  if (typeof value === 'string') {
    if (isRedactionExcludedFieldsPath(pathParts)) {
      return [];
    }
    return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))
      ? [pathParts.join('.') || '$']
      : [];
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectUnsafeStringValues(item, [...pathParts, String(index)]));
  }

  return Object.entries(value).flatMap(([key, nestedValue]) =>
    collectUnsafeStringValues(nestedValue, [...pathParts, key])
  );
}

function normalizeStoragePath(storagePath) {
  const requested = storagePath || DEFAULT_AUDIT_PATH;

  if (path.isAbsolute(requested)) {
    throw new Error('Audit storage path must be relative and dev-only.');
  }

  const normalized = path.normalize(requested);

  if (normalized.startsWith('..') || normalized.includes(`..${path.sep}`)) {
    throw new Error('Audit storage path cannot traverse outside the project.');
  }

  if (
    normalized !== APPROVED_AUDIT_DIR &&
    !normalized.startsWith(`${APPROVED_AUDIT_DIR}${path.sep}`)
  ) {
    throw new Error('Audit storage path must stay under .local-audit/.');
  }

  if (!normalized.endsWith('.jsonl')) {
    throw new Error('Audit storage path must be a .jsonl file.');
  }

  return normalized;
}

export function resolveAuditStorageConfig(options = {}) {
  const env = options.env || process.env;
  const enabled = env.AUDIT_STORAGE_ENABLED === 'true';
  const mode = enabled ? env.AUDIT_STORAGE_MODE || 'dev-jsonl' : 'disabled';
  const relativePath = normalizeStoragePath(env.AUDIT_STORAGE_PATH || DEFAULT_AUDIT_PATH);

  return {
    enabled,
    mode,
    relativePath,
    absolutePath: path.resolve(options.cwd || process.cwd(), relativePath)
  };
}

export function validateAuditRecordForStorage(record) {
  const schemaResult = validatePayload('auditRecord', record);
  const errors = [...schemaResult.errors];

  const unsafeKeys = collectUnsafeKeys(record);
  if (unsafeKeys.length > 0) {
    errors.push(`audit record contains denied field(s): ${unsafeKeys.join(', ')}`);
  }

  const unsafeValues = collectUnsafeStringValues(record);
  if (unsafeValues.length > 0) {
    errors.push(`audit record contains secret-like value(s): ${unsafeValues.join(', ')}`);
  }

  if (record?.safety?.secrets_stored !== false) {
    errors.push('audit record must declare safety.secrets_stored = false');
  }

  if (record?.safety?.raw_prompt_stored !== false) {
    errors.push('audit record must declare safety.raw_prompt_stored = false');
  }

  if (record?.safety?.raw_provider_response_stored !== false) {
    errors.push('audit record must declare safety.raw_provider_response_stored = false');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function prepareAuditRecordForDevJsonl(record) {
  return {
    ...record,
    storage: {
      mode: 'dev_jsonl',
      persisted: true
    }
  };
}

export function appendAuditRecord(record, options = {}) {
  const config = resolveAuditStorageConfig(options);

  if (!config.enabled) {
    return {
      written: false,
      reason: 'audit_storage_disabled',
      path: config.relativePath
    };
  }

  if (config.mode !== 'dev-jsonl') {
    throw new Error('Only AUDIT_STORAGE_MODE=dev-jsonl is supported by the dev-only prototype.');
  }

  const recordToWrite = prepareAuditRecordForDevJsonl(record);
  const validation = validateAuditRecordForStorage(recordToWrite);

  if (!validation.valid) {
    throw new Error(`Audit record refused: ${validation.errors.join('; ')}`);
  }

  fs.mkdirSync(path.dirname(config.absolutePath), { recursive: true });
  const line = `${JSON.stringify(recordToWrite)}\n`;
  fs.appendFileSync(config.absolutePath, line, 'utf8');

  return {
    written: true,
    reason: null,
    path: config.relativePath,
    bytes: Buffer.byteLength(line)
  };
}

export function readAuditJsonl(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
