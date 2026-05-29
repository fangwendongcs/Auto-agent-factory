# Release Notes: V0.14 GitHub Presentation Polish

V0.14 is a presentation-focused milestone. It does not add new workflow runtime capability. Its purpose is to make the repository easier to evaluate from the GitHub landing page.

## Suggested GitHub release body

Auto Agent Factory V0.14 polishes the GitHub-facing presentation for the existing V0.13 local demo release candidate.

This release focuses on making the project easier to understand at a glance:

- compressed the README first screen
- added an architecture snapshot
- added a milestone summary
- added V0.13 / V0.14 release notes
- clarified the safe local demo path
- cleaned up the docs index so readers have a clear starting point

The underlying project remains a **mock-first, read-only, human-reviewable Agent workflow skeleton**. It is not production autonomous execution.

## What changed

- `README.md` now leads with project value, current status, architecture snapshot, and safety boundaries.
- `docs/README.md` now links the core presentation docs, milestone summary, and release notes.
- `docs/MILESTONE_SUMMARY.md` summarizes the staged path from mock-first MVP to local demo RC.
- `docs/RELEASE_NOTES_V0_13_RC.md` records the local demo release-candidate scope.
- `docs/RELEASE_NOTES_V0_14_PRESENTATION_POLISH.md` records this presentation-polish milestone.

## What did not change

- No workflow JSON changes.
- No n8n runtime integration changes.
- No real provider call.
- No credential, token, or API key changes.
- No production write execution.
- No shell, Git, file-write, or external write action was enabled.

## Safety boundary

V0.14 remains documentation and presentation only. The real provider path, where previously validated, is read-only and returns review-oriented output. Local demo artifacts remain under `.local-audit/`, which is ignored by Git.

## Suggested validation

```bash
npm test
npm run workflow:validate:all
npm run workflow:dry-run
npm run import:check
npm run demo:local
```

## Recommended next step

If the docs and validation remain stable, create a GitHub pre-release from these notes. Do not move directly to production autonomous execution.
