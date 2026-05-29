# Local Demo Runbook

This runbook shows the fastest safe path to understand and replay the current project locally.

The demo is repo-side only. It does not connect to n8n runtime, does not call real providers, and does not enable autonomous execution.

## 1. Current demo status

Current release-candidate stage:

```text
V0.13 Local Demo / Release Candidate Packaging
```

Validated local capabilities:

- workflow JSON validation
- sanitized audit record fixture
- audit review report generation
- human sign-off review package generation
- sanitized human decision record generation
- dev-only local sign-off ledger append
- ledger summary report
- one-command local replay

## 2. Quick command

Run the full local demo:

```bash
npm run demo:local
```

This runs:

```text
npm test
npm run workflow:validate:all
npm run audit:report
npm run audit:signoff
npm run audit:cycle:replay
```

The command writes only dev-local artifacts under `.local-audit/`, which is ignored by Git.

## 3. Step-by-step path

If you prefer to inspect each step manually:

```bash
npm test
npm run workflow:validate:all
npm run audit:report
npm run audit:signoff
npm run audit:cycle:replay
```

Optional import readiness checks:

```bash
npm run workflow:dry-run
npm run import:check
```

## 4. Expected local artifacts

The replay may generate:

```text
.local-audit/reports/v012-*-audit-report.md
.local-audit/signoff/v012-*-signoff-review.md
.local-audit/signoff-ledger/v012-*-ledger.jsonl
```

These files are local demo outputs only. They should not be committed.

## 5. What to look for

A successful demo should show:

- all tests pass
- all workflow JSON files validate with no warnings or errors
- audit report prints a sanitized run summary
- sign-off review prints a human checklist and manual sign-off block
- cycle replay appends one dev-only decision record
- ledger summary shows `Needs review: 1`
- no real provider call is made
- no n8n runtime is touched

## 6. Safety boundaries

The local demo does not enable:

- production autonomous execution
- n8n runtime writes
- real provider calls
- shell execution from workflows
- Git modification from workflows
- external write actions
- credential reads
- raw prompt or provider payload storage

## 7. Cleanup

Local demo artifacts can be removed manually if desired:

```text
.local-audit/
```

Do not commit `.local-audit/` outputs.
