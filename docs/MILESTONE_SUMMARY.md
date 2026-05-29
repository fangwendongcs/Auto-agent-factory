# Milestone Summary

This project is intentionally staged. Each milestone tightens one part of the Agent workflow control plane before enabling any real write action.

## Current status

```text
V0.13 Local Demo Release Candidate
```

The project is still not a production autonomous agent. It is a local, mock-first, human-reviewable workflow skeleton with a read-only provider sandbox and a reproducible local demo path.

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

## What has been proven

- Workflow JSON can be validated and imported in a documented order.
- Executor mode routing can distinguish mock, dry-run, real-readonly stub, and read-only provider paths.
- Criteria checking can consume criterion-indexed evidence.
- High-risk and forbidden requests can be blocked before executor dispatch.
- Audit and human-review artifacts can be generated locally from sanitized records.
- The local demo can be replayed without n8n runtime access or provider calls.

## What is intentionally not enabled

- production autonomous execution
- provider-driven write actions
- shell execution
- Git modification
- external write actions
- live SaaS operations
- real Codex/coding-agent execution
- public unauthenticated production webhook use

## Next likely milestone

```text
V0.14 GitHub Presentation Polish / Release Notes
```

The goal is project presentation, not new automation capability.
