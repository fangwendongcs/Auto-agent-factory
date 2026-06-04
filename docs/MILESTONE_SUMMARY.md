# Milestone Summary

This project is intentionally staged. Each milestone tightens one part of the Agent workflow control plane before enabling any real write action.

## Current status

```text
V0.17 Recovery Policy Verified
```

The project is still not a production autonomous agent. It is a local, mock-first, human-reviewable workflow skeleton with a reproducible local demo path, local n8n runtime checks, a verified real DeepSeek read-only provider contract, and a verified Error Handler recovery policy contract.

The forward roadmap now starts from this V0.13 baseline. Do not restart the roadmap at V0.6; the audit, sign-off, local replay, and demo foundations already exist.

## Milestones

| Milestone | Focus | Result |
|---|---|---|
| V0.1–V0.3 | Mock-first n8n workflow MVP | Master / Executor / Checker / Error Handler workflows, validation scripts, import checks |
| V0.4 | Provider adapter design | OpenAI-compatible read-only provider interface selected and planned |
| V0.5 | Real provider sandbox | One read-only provider call validated; output remains `needs_review` |
| V0.6 | Evaluator alignment | Criterion-indexed evidence contract and checker exact-match path validated |
| V0.7 | Controlled execution boundaries | read-only / write-like / forbidden action classes and approval semantics validated |
| V0.8 | Audit and replay foundation | Sanitized audit record, dev-only JSONL storage, replay fixture |
| V0.9 | Audit review report | Human-readable sanitized audit report and optional local artifact |
| V0.10 | Human sign-off review | Local sign-off review package with checklist and manual decision block |
| V0.11 | Decision ledger | Dev-only human decision record, JSONL ledger, and ledger summary |
| V0.12 | End-to-end local replay | sample audit record → report → sign-off → decision → ledger → summary |
| V0.13 | GitHub/local demo packaging | `npm run demo:local`, docs navigation, release-candidate packaging |
| V0.14 | Project state closeout | Version language, README, capability matrix, roadmap, safety boundary, action drafts |
| V0.15 | Local runtime hardening | Docker compose for local n8n, offline/online runtime health checks |
| V0.16 | DeepSeek read-only contract | Real DeepSeek V4 Pro read-only provider call verified; normalized output remains `needs_review` |
| V0.17 | Recovery policy | Verified: Error Handler runtime emits `recovery_policy`; controlled `provider_5xx` failure maps to `retry_provider_readonly` while keeping human review required and write actions disabled |

## What has been proven

- Workflow JSON can be validated and imported in a documented order.
- Executor mode routing can distinguish mock, dry-run, real-readonly stub, and read-only provider paths.
- Criteria checking can consume criterion-indexed evidence.
- High-risk and forbidden requests can be blocked before executor dispatch.
- Audit and human-review artifacts can be generated locally from sanitized records.
- The local demo can be replayed without n8n runtime access or provider calls.
- Local runtime readiness can be checked offline, and a running local n8n can be probed online.
- DeepSeek V4 Pro can complete the real read-only provider contract through local n8n with normalized `summary`, criterion-indexed `evidence`, and `risk_summary`.
- Provider and workflow failures can be classified into bounded recovery decisions without enabling write actions or automatic retry.
- Error Handler runtime can turn a controlled `provider_5xx` failure into `error_class = provider_5xx`, `decision = retry`, and `next_action = retry_provider_readonly` while preserving `notification_markdown` and `recovery_advice`.

## What is intentionally not enabled

- production autonomous execution
- provider-driven write actions
- shell execution
- Git modification
- external write actions
- live SaaS operations
- real Codex/coding-agent execution
- public unauthenticated production webhook use

## Next roadmap

```text
V0.14 Project State Closeout
V0.15 Local Runtime Hardening
V0.16 Real DeepSeek Read-only Run
V0.17 Recovery Policy Verified
V0.18 Human Approval Console Lite
V0.19 Action Drafts
V1.0 Local Production Workflow
```

V0.18 starts the Human Approval Console Lite stage. It should stay local-first and review-only: show pending recovery or high-risk decisions, record approve/reject/needs-review decisions into the existing dev-only decision ledger, and avoid enabling workflow writes or automatic execution.

See `docs/LOCAL_PRODUCTION_WORKFLOW_ROADMAP.md` for the implementation-oriented path from the current release-candidate baseline to local production workflow readiness.
