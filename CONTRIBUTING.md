# Contributing to Auto Agent Factory

Thanks for considering a contribution. This project is an open-source, local-first AI Agent governance toolkit. The priority is safe, reproducible workflow design before any real write action is enabled.

## Development principles

- Keep changes small and reviewable.
- Preserve the local demo path.
- Do not modify n8n workflow JSON unless the change is intentional and documented.
- Keep real provider behavior read-only unless a future design explicitly says otherwise.
- Do not add production dependencies without a clear reason.
- Do not claim production readiness unless it has been implemented and verified.

## Local setup

```bash
npm install
npm test
npm run workflow:validate:all
npm run workflow:dry-run
npm run import:check
npm run demo:local
```

## Useful scripts

| Script | Purpose |
|---|---|
| `npm test` | run the Node test suite |
| `npm run demo:local` | run the safe repo-side local demo |
| `npm run workflow:validate:all` | validate exported n8n workflow JSON files |
| `npm run workflow:dry-run` | validate deploy script behavior without calling n8n API |
| `npm run import:check` | check n8n import readiness and binding reminders |
| `npm run audit:report` | generate a sanitized audit review report |
| `npm run audit:signoff` | generate a human sign-off review package |
| `npm run audit:cycle:replay` | replay the local audit/sign-off/ledger cycle |

## Safety checklist before opening a PR

Confirm your diff does not contain:

- real API keys
- `Bearer <secret>`
- `.env` or `.env.local`
- credential plaintext
- `.local-audit/` artifacts
- provider raw response payloads
- full prompt or provider messages
- private user data

If workflow JSON changed, include:

- what node changed
- why it changed
- how old paths were preserved
- validation output
- manual n8n import or runtime notes, if relevant

## Pull request expectations

Use the pull request template and include:

- summary of the change
- files changed
- validation commands run
- safety considerations
- known limitations

This project values boring, explicit safety over clever automation.
