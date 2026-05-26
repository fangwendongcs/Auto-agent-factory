# Release Notes: v0.3.0 Mock-First MVP Validation

Auto Agent Factory v0.3.0 is a validation-focused release for the mock-first, goal-driven n8n workflow skeleton.

This release is intended to prove workflow structure, routing, validation, and safety boundaries before connecting real LLM or Codex/coding-agent providers.

## What's Included

- Four importable n8n workflow modules:
  - `[GoalDriven] 01 Master`
  - `[GoalDriven] 02 Agent Task Executor`
  - `[GoalDriven] 03 Criteria Checker`
  - `[GoalDriven] 04 Error Handler`
- Mock-first executor path.
- `dry-run` mode routing.
- `real-readonly` stub mode routing for future provider adapter shape.
- Invalid payload blocking before executor dispatch.
- High-risk request blocking / manual review behavior.
- Mode Router regression validation trail.
- Goal, task, and result JSON schemas.
- Criteria scoring utilities.
- Sample goal request, sample agent results, final report example, and manual test payloads.
- Workflow validation scripts.
- Dry-run deployment check.
- n8n import readiness check.
- Runbook and manual import checklist.
- Production readiness, n8n security checklist, and real provider adapter design notes.
- GitHub CI workflow, issue templates, pull request template, changelog, and MIT license.

## Validation

Expected validation commands for this release:

```bash
npm test
npm run workflow:validate:all
npm run workflow:dry-run
npm run import:check
```

Manual validation should also confirm:

- workflows import into n8n in the documented order
- workflows remain inactive by default after import
- Executor and Criteria Checker bindings are selected correctly in the Master workflow
- Error Handler is configured as the Master error workflow
- `mock`, `dry-run`, and `real-readonly` stub routes remain distinguishable
- high-risk payloads are blocked or routed to manual review behavior
- invalid payloads return clear validation errors

## Current Limitations

- This is not a production autonomous agent.
- Real LLM provider calls are not connected yet.
- Real Codex/coding-agent automation is not connected yet.
- The `real-readonly` path is currently a stub, not a live provider integration.
- No file writes, shell execution, Git modification, or external write actions are enabled.
- No persistent run history database is included.
- No hosted dashboard or approval UI is included.
- n8n import still requires manual verification of sub-workflow bindings.
- This release does not include real user data processing.

## Safety Notes

- Keep workflow exports inactive until manually verified in n8n.
- Do not store real API keys, webhook secrets, tokens, or credentials in workflow JSON.
- Use n8n credentials, backend proxies, or future provider adapters for secret-bearing integrations.
- Keep new provider work behind read-only or dry-run boundaries first.
- Preserve the normalized `agent_result` contract so Criteria Checker behavior remains stable.

## Next Milestones

- Add a real provider adapter in read-only mode behind the existing executor contract.
- Add a Codex/coding-agent adapter behind explicit safety boundaries.
- Add persistent run history for execution tracking.
- Add a human approval UI.
- Add evaluation reports and workflow observability.
- Explore RAG or knowledge-base adapters without moving private data into frontend assets.
