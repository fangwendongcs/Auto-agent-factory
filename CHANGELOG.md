# Changelog

All notable changes to Auto Agent Factory will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses semantic versioning where practical during MVP validation.

## [1.0.0-rc.1] - 2026-05-29

### Added

- Open-source release-candidate positioning for Auto Agent Factory as a local-first AI Agent governance toolkit.
- One-command local demo path with `npm run demo:local`.
- Sanitized audit record, audit report, human sign-off review, decision ledger, and local review cycle replay documentation.
- Copy-ready v1.0 release-candidate notes.
- `CONTRIBUTING.md`, `SECURITY.md`, and open-source release checklist.
- English and Chinese README updates for local demo, n8n workflow, and real provider sandbox usage paths.

### Changed

- Updated package metadata to `1.0.0-rc.1` for release-candidate preparation while keeping npm publishing disabled.
- Reframed README as an open-source landing page rather than an internal phase log.
- Reorganized documentation index by local demo, workflows, safety/governance, audit/sign-off, release notes, and advanced setup.

### Safety

- Reconfirmed that this release candidate is not a production autonomous agent.
- Reconfirmed that provider use remains read-only / review-oriented.
- Reconfirmed that no shell execution, Git modification, workflow file write, or external write action is enabled by default.

## [0.3.0] - 2026-05-26

### Added

- v0.3.0 Mock-First MVP Validation release positioning.
- README first-screen positioning for Auto Agent Factory.
- Four importable n8n workflow modules:
  - `[GoalDriven] 01 Master`
  - `[GoalDriven] 02 Agent Task Executor`
  - `[GoalDriven] 03 Criteria Checker`
  - `[GoalDriven] 04 Error Handler`
- Mock-first executor path for validating workflow contracts before real provider integration.
- `dry-run` route for checking execution shape without real provider calls.
- `real-readonly` stub route for validating future adapter boundaries.
- Payload schemas for goals, tasks, and results.
- Criteria scoring utilities.
- Node.js test suite for schema behavior, criteria scoring, and workflow contracts.
- Workflow validation scripts.
- Dry-run deployment check.
- n8n import readiness check.
- Manual payload examples for valid, invalid, high-risk, dry-run, and real-readonly stub scenarios.
- Runbook, import order, manual import checklist, production readiness notes, security checklist, and provider adapter design docs.
- MIT license.
- GitHub CI workflow, issue templates, and pull request template.
- Screenshot and asset TODO for future GitHub presentation assets.

### Changed

- Clarified that the current stage is Mock-First MVP Validation, not production autonomous execution.
- Clarified that real LLM and Codex/coding-agent providers are not connected yet.
- Clarified safety boundaries around high-risk review, invalid payload blocking, dry-run behavior, and inactive workflow exports.
- Updated CI to run tests, workflow validation, dry-run check, and import readiness check.

### Known limitations

- Real LLM provider calls are not connected yet.
- Real Codex/coding-agent automation is not connected yet.
- The `real-readonly` path is currently a stub, not a live provider integration.
- No file writes, shell execution, Git modification, or external write actions are enabled.
- No persistent run history database is included.
- No hosted dashboard or human approval UI is included.
- n8n import still requires manual verification of sub-workflow bindings.
- This project is not a production autonomous agent or SaaS system.
- This release does not include real user data processing.
