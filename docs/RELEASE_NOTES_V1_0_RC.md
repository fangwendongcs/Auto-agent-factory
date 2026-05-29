# Release Notes: v1.0-rc.1 Open-source Release Candidate

Auto Agent Factory v1.0-rc.1 is the first open-source release-candidate packaging of the project as a local-first AI Agent governance toolkit.

It is designed for developers who want to clone the repo, run a safe local demo, inspect the n8n workflow architecture, and extend the governance pattern without enabling unbounded Agent execution.

## Suggested GitHub release body

Auto Agent Factory is a local-first governance toolkit for goal-driven n8n Agent workflows. It provides a mock-first, read-only, human-reviewable workflow skeleton with validation scripts, audit artifacts, and a local review cycle replay.

### Highlights

- Four importable n8n workflow JSON files.
- `mock`, `dry-run`, `real-readonly` stub, and read-only provider sandbox paths.
- Criteria checker alignment with criterion-indexed evidence.
- Controlled execution boundaries for read-only, write-like, high-risk, and forbidden requests.
- Sanitized audit record schema and sanitizer.
- Audit review report generator.
- Human sign-off review package generator.
- Dev-only human decision ledger.
- One-command local review cycle replay.
- One-command local demo.
- Open-source docs: `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, release notes, and release checklist.

### Quick start

```bash
npm install
npm run demo:local
```

Full local validation:

```bash
npm test
npm run workflow:validate:all
npm run workflow:dry-run
npm run import:check
npm run audit:report
npm run audit:signoff
npm run audit:cycle:replay
```

### What this release is

- a local-first Agent workflow governance toolkit
- a reproducible n8n workflow skeleton
- a safe local demo path that does not require API keys
- a read-only provider sandbox design
- a human-reviewable audit/sign-off prototype

### What this release is not

- not a SaaS product
- not a production autonomous Agent
- not a production approval system
- not a multi-user RBAC system
- not a production database-backed audit system
- not a workflow that performs shell, Git, file-write, or external write actions by default

### Safety notes

This release must not include:

- real API keys
- `.env` files
- `Authorization` / `Bearer` values
- credential plaintext
- `.local-audit/` artifacts
- provider raw full responses
- full prompt or provider message payloads

Local demo artifacts are written only under `.local-audit/`, which is ignored by Git.

## Recommended tag

```text
v1.0.0-rc.1
```

## Release-candidate judgment

This release is suitable as an open-source v1.0 release candidate if the following checks pass:

```bash
npm test
npm run workflow:validate:all
npm run workflow:dry-run
npm run import:check
npm run demo:local
```

It should not be described as production-ready or autonomous.
