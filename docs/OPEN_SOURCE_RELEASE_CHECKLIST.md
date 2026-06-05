# Open-source Release Checklist

Use this checklist before tagging an open-source release candidate.

## Repository presentation

- [ ] README first screen explains the project value clearly.
- [ ] README states the project is local-first and not production autonomous execution.
- [ ] README includes Quick Start and local demo commands.
- [ ] README links to architecture, runbook, release notes, contributing, security, and license files.
- [ ] README links to the V1.0 local production workflow readiness runbook.
- [ ] Chinese README is broadly aligned with English README.

## Required open-source files

- [ ] `LICENSE` exists.
- [ ] `CONTRIBUTING.md` exists.
- [ ] `SECURITY.md` exists.
- [ ] release notes exist under `docs/`.

## Validation commands

Run:

```bash
npm test
npm run workflow:validate:all
npm run workflow:dry-run
npm run import:check
npm run demo:local
npm run audit:report
npm run audit:signoff
npm run audit:cycle:replay
npm run runtime:health:offline
npm run sandbox:deepseek:readonly
npm run recovery:policy
npm run approval:console
npm run action:draft
git diff --check
```

## Secret safety checklist

Confirm the diff and tracked files do not contain:

- [ ] real API keys
- [ ] `Bearer <secret>`
- [ ] `.env` or `.env.local`
- [ ] credential plaintext
- [ ] `.local-audit/` artifacts
- [ ] provider raw full responses
- [ ] full prompt or provider message payloads
- [ ] private user data
- [ ] `.local-audit/` readiness ledger artifacts

## Workflow safety checklist

- [ ] Workflow JSON exports remain inactive by default.
- [ ] No workflow change enables shell execution.
- [ ] No workflow change enables Git modification.
- [ ] No workflow change enables file-write or external write action.
- [ ] Real provider path remains read-only unless explicitly redesigned and reviewed.
- [ ] Recovery policy retry decisions remain advisory and require human review.
- [ ] Human Approval Console writes only to `.local-audit/signoff-ledger/*.jsonl` when explicitly enabled.
- [ ] Action drafts remain draft-only and do not authorize automatic execution.

## Release judgment

A `v1.0.0-rc.1` tag is reasonable when:

- local demo passes,
- workflow validation passes,
- docs are internally consistent,
- open-source files are present,
- secret audit passes,
- limitations are stated honestly.
- V1.0 local production workflow readiness runbook has current verification results.
