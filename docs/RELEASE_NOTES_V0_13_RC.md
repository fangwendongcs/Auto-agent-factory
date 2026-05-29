# Release Notes: V0.13 Local Demo Release Candidate

V0.13 packages Auto Agent Factory into a local demo release candidate. The goal is to make the project understandable and replayable from GitHub without requiring n8n credentials, provider keys, or production infrastructure.

## Highlights

- One-command local demo:

```bash
npm run demo:local
```

- End-to-end local review cycle:

```text
sample audit record
→ audit report
→ human sign-off review
→ human decision record
→ dev-only ledger append
→ ledger summary
```

- Workflow validation remains available:

```bash
npm run workflow:validate:all
npm run workflow:dry-run
npm run import:check
```

## Included capabilities

- Four importable n8n workflow JSON files.
- Mock, dry-run, real-readonly stub, and read-only provider sandbox paths.
- Criteria checker alignment using criterion-indexed evidence.
- Controlled execution boundaries for read-only, write-like, high-risk, and forbidden requests.
- Sanitized audit record schema and sanitizer.
- Dev-only JSONL audit storage.
- Audit review report generator.
- Human sign-off review package generator.
- Dev-only sign-off decision ledger.
- Local review cycle replay.
- GitHub-facing docs navigation and local demo runbook.

## Validation commands

Expected local validation path:

```bash
npm test
npm run workflow:validate:all
npm run workflow:dry-run
npm run import:check
npm run audit:cycle:replay
npm run demo:local
```

## Safety notes

V0.13 does not enable:

- production autonomous execution
- real provider write actions
- Codex/coding-agent execution
- shell execution
- Git modification
- external write actions
- n8n runtime writes from local demo tooling

Any local demo artifacts are written under `.local-audit/`, which is ignored by Git.

## Known limitations

- n8n import still requires manual verification of sub-workflow bindings.
- The real provider path is read-only and still returns review-oriented output.
- There is no hosted dashboard or production approval UI.
- The local ledger is a dev-only JSONL prototype, not a production audit database.
- No real user data processing is included.

## Recommended next step

Use V0.14 for GitHub presentation polish and release notes, not new low-level workflow capability.
