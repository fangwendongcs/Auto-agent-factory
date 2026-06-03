# Release Notes: V0.14 Project State Closeout

V0.14 is the formal closeout for the current project state. It is not "presentation only"; it packages the existing V0.13 local demo release candidate into a clearer, verifiable, GitHub-ready baseline.

The milestone unifies version language, makes the README more professional, documents local demo acceptance, records the current capability matrix, publishes the forward roadmap, and restates the safety boundary before moving toward local production workflow readiness.

## Suggested GitHub release body

Auto Agent Factory V0.14 closes out the current local-first Agent governance baseline.

This release makes the project easier to evaluate and verify:

- unified version language around V0.13 RC / V0.14 closeout / V1.0 local production workflow readiness
- professionalized README and docs navigation
- documented the safe local demo acceptance path
- added a current capability matrix
- added the V0.13-to-V1.0 local production workflow roadmap
- added draft-only action handoff contracts and CLI
- kept the safety boundary explicit: read-only, local-first, human-reviewable, no-write by default

The underlying project remains a **mock-first, read-only, human-reviewable Agent workflow skeleton**. It is not production autonomous execution.

## What changed

- `README.md` now leads with project value, current status, architecture snapshot, and safety boundaries.
- `docs/README.md` now links the core presentation docs, milestone summary, and release notes.
- `docs/MILESTONE_SUMMARY.md` summarizes the staged path from mock-first MVP to local demo RC.
- `docs/LOCAL_PRODUCTION_WORKFLOW_ROADMAP.md` defines V0.15-V1.0 as runtime hardening, DeepSeek read-only execution, recovery policy, approval console, and action drafts.
- `docs/RELEASE_NOTES_V0_13_RC.md` records the local demo release-candidate scope.
- `src/schema/recovery-policy.schema.json` records bounded failure handling decisions.
- `src/schema/provider-run-summary.schema.json` records sanitized provider execution summaries.
- `src/schema/action-draft.schema.json` records draft-only Codex/GitHub/commit/test handoff packages.
- `npm run action:draft` generates a local Markdown handoff from a sanitized audit record.
- `npm run demo:local` now validates the action draft handoff as part of the local demo path.

## What did not change

- No workflow JSON changes.
- No n8n runtime integration changes.
- No new real provider call.
- No credential, token, or API key changes.
- No production write execution.
- No shell, Git, file-write, or external write action was enabled.

## Capability matrix

| Capability | V0.14 status | Validation path |
|---|---|---|
| Version and roadmap clarity | Closed out | README, `docs/MILESTONE_SUMMARY.md`, `docs/LOCAL_PRODUCTION_WORKFLOW_ROADMAP.md` |
| Local demo replay | Supported | `npm run demo:local` |
| Workflow JSON validation | Supported | `npm run workflow:validate:all` |
| Sanitized audit report | Supported | `npm run audit:report` |
| Human sign-off review | Supported | `npm run audit:signoff` |
| Decision ledger replay | Supported, dev-only | `npm run audit:cycle:replay` |
| Draft-only action handoff | Supported | `npm run action:draft` |
| DeepSeek real provider | Planned next as read-only | V0.16 roadmap |
| Production write execution | Not enabled | Safety boundary |

## Local demo acceptance

V0.14 local demo acceptance means:

- tests pass
- workflow JSON validates
- sanitized audit report is generated
- human sign-off review is generated
- action draft handoff is generated
- local review cycle replay appends only dev-local ledger artifacts
- no real provider call is made
- no n8n runtime is touched
- no shell, Git, file-write, or external write action is enabled by workflow automation

## Safety boundary

V0.14 remains local-first and no-write by default. The real provider path, where previously validated, is read-only and returns review-oriented output. Local demo artifacts remain under `.local-audit/`, which is ignored by Git.

## Suggested validation

```bash
npm test
npm run workflow:validate:all
npm run workflow:dry-run
npm run import:check
npm run action:draft
npm run demo:local
```

## Recommended next step

If this closeout remains stable, move to V0.15 Local Runtime Hardening. Do not move directly to production autonomous execution.
