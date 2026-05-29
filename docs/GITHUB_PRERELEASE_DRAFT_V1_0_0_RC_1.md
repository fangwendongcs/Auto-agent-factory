# GitHub Pre-release Draft: v1.0.0-rc.1

Use this file as the copy source when creating a GitHub pre-release.

## GitHub release settings

| Field | Value |
|---|---|
| Tag | `v1.0.0-rc.1` |
| Target | `main` after the open-source RC preparation commit is pushed |
| Release title | `Auto Agent Factory v1.0.0-rc.1 — Local-first Agent Governance Toolkit` |
| Set as pre-release | Yes |
| Set as latest release | No |
| Generate release notes automatically | Optional, but use the curated body below as the primary release text |

## Pre-publish checklist

Before creating the GitHub pre-release:

- [ ] Commit the open-source RC preparation changes.
- [ ] Push `main` to GitHub.
- [ ] Confirm GitHub Actions pass on `main`.
- [ ] Confirm `.local-audit/` is not tracked.
- [ ] Confirm no `.env` file is tracked.
- [ ] Confirm no real API key, token, Authorization header, credential value, provider raw response, or full prompt/messages are present in the release diff.
- [ ] Confirm README and README.zh-CN describe the project as local-first and not production autonomous execution.
- [ ] Confirm the tag points to the intended commit.

## Copy-ready release body

Auto Agent Factory is a **local-first AI Agent governance toolkit** for goal-driven n8n workflows.

It helps developers prototype Agent workflows that are bounded, testable, auditable, and human-reviewable before any real write action is enabled. Instead of jumping from a prompt directly to automation, it provides a governance skeleton around the Agent loop: goal definition, criteria checking, controlled execution routing, audit records, human sign-off, and local replay.

This is the first open-source v1.0 release candidate.

## Highlights

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

## Quick start

```bash
npm install
npm run demo:local
```

The local demo is repo-side only. It does not connect to n8n runtime, does not call a real provider, and does not require an API key.

## Full local validation

```bash
npm test
npm run workflow:validate:all
npm run workflow:dry-run
npm run import:check
npm run audit:report
npm run audit:signoff
npm run audit:cycle:replay
```

## Usage paths

| Path | Requires API key? | Requires n8n runtime? | What it proves |
|---|---:|---:|---|
| Local demo path | No | No | replay a sanitized review cycle locally from sample data |
| n8n workflow path | No | Yes | import and validate the GoalDriven workflow skeleton in n8n |
| Real provider sandbox path | Yes, your own key in n8n Credentials | Yes | run a read-only provider sandbox that still returns `needs_review` |

## What this release is

- a local-first Agent workflow governance toolkit
- a reproducible n8n workflow skeleton
- a safe local demo path that does not require API keys
- a read-only provider sandbox design
- a human-reviewable audit/sign-off prototype
- an open-source foundation for safer Agent workflow experiments

## What this release is not

- not a SaaS product
- not a production autonomous Agent
- not a production approval system
- not a multi-user RBAC system
- not a production database-backed audit system
- not a workflow that performs shell, Git, file-write, or external write actions by default

## Safety notes

This release must not include:

- real API keys
- `.env` files
- Authorization / Bearer values
- credential plaintext
- `.local-audit/` artifacts
- provider raw full responses
- full prompt or provider message payloads

Local demo artifacts are written only under `.local-audit/`, which is ignored by Git.

## Recommended audience

This release candidate is useful for:

- developers exploring safer AI Agent orchestration patterns
- n8n users who want workflow JSON managed as code
- AI product builders designing human-in-the-loop execution boundaries
- maintainers who want local-first audit and sign-off prototypes before production infrastructure

## Known limitations

- n8n import still requires manual verification of sub-workflow bindings.
- The real provider path is read-only and review-oriented.
- There is no hosted dashboard or production approval UI.
- The local ledger is a dev-only JSONL prototype, not a production audit database.
- No real user data processing is included.
- No production autonomous execution is enabled.

## Suggested next milestone

Keep the release candidate focused on local-first governance. The next milestone should improve documentation, examples, and evaluator quality before any production write capability is considered.
