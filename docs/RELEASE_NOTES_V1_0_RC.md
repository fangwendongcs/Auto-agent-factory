# Release Notes: v1.0-rc.1 Open-source Release Candidate

Auto Agent Factory v1.0-rc.1 is the first open-source release-candidate packaging of the project as a local-first AI Agent governance toolkit. The current repo-side/local readiness path has now been verified through V1.0 Local Production Workflow Readiness.

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
- Local n8n runtime hardening and offline/online health checks.
- Verified DeepSeek V4 Pro read-only provider contract through the OpenAI-compatible provider path.
- V0.17 recovery policy with bounded `retry`, `stop`, and `needs_review` decisions.
- V0.18 Human Approval Console Lite for local recovery/high-risk review decisions.
- V0.19 draft-only Codex/GitHub handoff generation from human decision records.
- V1.0 local production workflow readiness runbook.
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
npm run runtime:health:offline
npm run sandbox:deepseek:readonly
npm run recovery:policy
npm run approval:console
npm run action:draft
```

### What this release is

- a local-first Agent workflow governance toolkit
- a reproducible n8n workflow skeleton
- a safe local demo path that does not require API keys
- a read-only provider sandbox design
- a human-reviewable audit/sign-off prototype
- a local readiness runbook that connects runtime health, read-only provider execution, recovery, approval, ledger, and draft handoff

### What this release is not

- not a SaaS product
- not a production autonomous Agent
- not a production approval system
- not a multi-user RBAC system
- not a production database-backed audit system
- not a workflow that performs shell, Git, file-write, or external write actions by default
- not a release that stores provider credentials or raw provider payloads in Git

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
npm run runtime:health:offline
npm run recovery:policy
npm run approval:console
npm run action:draft
git diff --check
```

It should not be described as production-ready or autonomous.

## Current readiness note

`docs/V1.0_LOCAL_PRODUCTION_WORKFLOW_READINESS_RUNBOOK.md` records the verified repo-side/local readiness path. The real DeepSeek online send is intentionally gated behind local n8n credentials and explicit local shell opt-in; provider send remains disabled by default in the repo-side sandbox command.
