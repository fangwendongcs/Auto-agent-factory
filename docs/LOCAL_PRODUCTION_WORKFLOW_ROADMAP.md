# Local Production Workflow Roadmap

This roadmap replaces the earlier V0.6-to-V1.0 planning shorthand. The repository is already at the V0.13 local demo release-candidate stage, so the next work should harden the existing local-first review loop instead of rebuilding completed audit and sign-off foundations.

## Current baseline

The current baseline is:

```text
V0.19 Action Drafts Started
```

Already proven:

- local sanitized audit records
- local audit review reports
- human sign-off review packages
- dev-only decision ledger
- local review-cycle replay
- mock, dry-run, real-readonly, and read-only provider sandbox boundaries
- verified real DeepSeek V4 Pro read-only provider contract
- verified repo-side and Error Handler recovery policy classification for retry, stop, and needs-review outcomes
- runtime-verified controlled `provider_5xx` recovery advice with human review required and write actions disabled
- verified local Human Approval Console Lite for recovery/high-risk review decisions
- draft-only Codex/GitHub handoff generation from V0.18 human decision records
- one-command safe local demo

The system is still not a production autonomous agent. It remains local-first, review-first, and no-write by default.

## Milestone path

| Milestone | Focus | Exit criteria |
|---|---|---|
| V0.14 Project State Closeout | Make the repo easy to evaluate and verify as an Agent governance project | Version language, README, local demo acceptance, capability matrix, roadmap, and safety boundary all describe the current V0.13+ baseline accurately |
| V0.15 Local Runtime Hardening | Make local Docker and n8n runtime checks repeatable | Local n8n startup, workflow import, workflow binding review, and offline/online health checks are documented and reproducible |
| V0.16 Real DeepSeek Read-only Run | Validate real provider output without enabling writes | Verified: local n8n calls DeepSeek V4 Pro through the read-only provider path and normalizes the result into `agent_result.status = needs_review` |
| V0.17 Recovery Policy | Make failures classifiable and recoverable | Verified: schema, CLI, and Error Handler runtime output map failures to `retry`, `stop`, or `needs_review`; controlled `provider_5xx` maps to `retry_provider_readonly` with human review required and no automatic retry |
| V0.18 Human Approval Console Lite | Keep high-risk and recovery work behind local review | Verified: local console records recovery/high-risk decisions into the dev-only ledger and summary report confirms valid needs-review/rejected records without automatic execution |
| V0.19 Action Drafts | Generate handoff drafts instead of executing writes | Started: Codex prompt, GitHub Issue draft, commit message, and test commands are generated from V0.18 human decisions for human review only |
| V1.0 Local Production Workflow | Combine long-running local n8n, read-only provider execution, audit, recovery, and manual execution handoff | Local tasks are triggerable, traceable, recoverable, and reviewable before any Codex/Git/GitHub write action |

## Contract additions

The existing core contracts remain stable:

- `goal`
- `task`
- `agent_result`
- `audit_record`
- `signoff_decision`

The local production path adds three review-only contracts:

- `recovery_policy`: `retry`, `stop`, or `needs_review` decision for failures, approval blocks, and timeouts.
- `provider_run_summary`: sanitized provider metadata such as provider, status, latency, score, and structured error.
- `action_draft`: draft-only Codex prompt, GitHub Issue text, commit message, and test command handoff.

These contracts must not include secrets, raw prompts, raw provider responses, or any instruction that bypasses human approval.

## Local commands

Baseline validation remains:

```bash
npm test
npm run workflow:validate:all
npm run runtime:health:offline
npm run demo:local
```

Generate a local action draft from a sanitized audit record:

```bash
npm run action:draft
```

Review a recovery or high-risk decision in the local approval console:

```bash
npm run approval:console
```

This prints a Markdown draft to stdout. It does not write files, connect to n8n, modify Git, run shell commands from the draft, or call external write APIs.

Check the local runtime:

```bash
npm run runtime:health:offline
npm run runtime:health
```

Prepare a DeepSeek read-only sandbox payload:

```bash
npm run sandbox:deepseek:readonly
```

The DeepSeek sandbox script sends to n8n only when `DEEPSEEK_SANDBOX_SEND_ENABLED=true`.

## V1.0 safety line

V1.0 means local production workflow readiness, not SaaS production autonomy.

Allowed by default:

- Docker and n8n running locally
- local task trigger
- DeepSeek read-only provider execution
- automatic criteria checking
- local sanitized audit trail
- bounded recovery decisions
- human approval for high-risk work
- Codex/GitHub/GitHub Desktop handoff drafts

Not allowed by default:

- shell execution from workflow
- Git modification from workflow
- file writes from workflow
- external write actions
- public unauthenticated webhook exposure
- cloud database requirement
- storing API keys in frontend code, workflow JSON, docs, examples, or Git
