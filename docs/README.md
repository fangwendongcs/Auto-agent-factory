# Documentation Index

This directory contains the architecture, operations, safety, validation, audit, and release documentation for Auto Agent Factory.

## Start here

- [`LOCAL_DEMO_RUNBOOK.md`](LOCAL_DEMO_RUNBOOK.md) — fastest safe path to run the repo-side local demo.
- [`WORKFLOW_DESIGN.md`](WORKFLOW_DESIGN.md) — architecture and workflow module responsibilities.
- [`MILESTONE_SUMMARY.md`](MILESTONE_SUMMARY.md) — compact map from mock-first MVP to local demo RC.
- [`VALIDATION_LOG.md`](VALIDATION_LOG.md) — recorded runtime and local validation milestones.
- [`RUNBOOK.md`](RUNBOOK.md) — operational runbook for validation, import, troubleshooting, and rollback.

## Local demo

- [`LOCAL_DEMO_RUNBOOK.md`](LOCAL_DEMO_RUNBOOK.md) — practical local demo walkthrough for GitHub readers.
- [`V0.12_LOCAL_REVIEW_CYCLE_REPLAY.md`](V0.12_LOCAL_REVIEW_CYCLE_REPLAY.md) — one-command local replay from sanitized audit record to ledger summary.
- [`V0.13_LOCAL_DEMO_RELEASE_CANDIDATE_PACKAGING.md`](V0.13_LOCAL_DEMO_RELEASE_CANDIDATE_PACKAGING.md) — local demo / release-candidate packaging note.

## Architecture / workflows

- [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md) — product positioning, target users, and MVP scope.
- [`MVP_ACCEPTANCE_CRITERIA.md`](MVP_ACCEPTANCE_CRITERIA.md) — explicit acceptance criteria for the MVP.
- [`WORKFLOW_DESIGN.md`](WORKFLOW_DESIGN.md) — high-level workflow design and module responsibilities.
- [`TEST_CASES.md`](TEST_CASES.md) — automated and manual test matrix.
- [`IMPORT_ORDER.md`](IMPORT_ORDER.md) — n8n workflow import order.
- [`MANUAL_IMPORT_CHECKLIST.md`](MANUAL_IMPORT_CHECKLIST.md) — manual import and validation checklist.
- [`V0_3A_REAL_READONLY_UI_VERIFICATION.md`](V0_3A_REAL_READONLY_UI_VERIFICATION.md) — n8n UI verification checklist for the real-readonly stub path.

## Safety / governance

- [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md) — Go / No-Go checklist before moving beyond mock-first validation.
- [`REAL_PROVIDER_ADAPTER_DESIGN.md`](REAL_PROVIDER_ADAPTER_DESIGN.md) — adapter design for mock, dry-run, and real-readonly provider modes.
- [`ADR_0001_REAL_READONLY_PROVIDER_SELECTION.md`](ADR_0001_REAL_READONLY_PROVIDER_SELECTION.md) — decision record for the OpenAI-compatible read-only provider interface.
- [`V0_4_PROVIDER_INTEGRATION_PREP.md`](V0_4_PROVIDER_INTEGRATION_PREP.md) — read-only provider integration preparation checklist.
- [`V0.4C_REAL_READONLY_IMPLEMENTATION_PLAN.md`](V0.4C_REAL_READONLY_IMPLEMENTATION_PLAN.md) — minimal implementation plan for the OpenAI-compatible real-readonly provider path.
- [`V0.5_REAL_PROVIDER_SANDBOX_TEST_PLAN.md`](V0.5_REAL_PROVIDER_SANDBOX_TEST_PLAN.md) — sandbox test plan for the first real provider validation.
- [`V0.5_SANDBOX_MANUAL_SETUP_CHECKLIST.md`](V0.5_SANDBOX_MANUAL_SETUP_CHECKLIST.md) — manual n8n setup checklist before a real provider sandbox call.
- [`V0.6_EVALUATOR_QUALITY_PLAN.md`](V0.6_EVALUATOR_QUALITY_PLAN.md) — evaluator quality, criteria/evidence alignment, and safety hardening plan.
- [`V0.7_CONTROLLED_EXECUTION_BOUNDARIES.md`](V0.7_CONTROLLED_EXECUTION_BOUNDARIES.md) — controlled execution boundary design and V0.7 runtime verification before enabling any real write actions.
- [`V0.8_STAGING_PILOT_AUDIT_ROLLBACK_DESIGN.md`](V0.8_STAGING_PILOT_AUDIT_ROLLBACK_DESIGN.md) — staging pilot, audit logging, approval record, run history, failure recovery, rollback, and no-write default design.

## Audit / sign-off

- [`V0.8B_SANITIZED_AUDIT_LOG_PROTOTYPE.md`](V0.8B_SANITIZED_AUDIT_LOG_PROTOTYPE.md) — repo-side sanitized audit record schema, mock sanitizer, and no-write audit prototype.
- [`V0.8C_DEV_ONLY_AUDIT_STORAGE_PLAN.md`](V0.8C_DEV_ONLY_AUDIT_STORAGE_PLAN.md) — dev-only sanitized audit storage plan and allowlist/denylist strategy.
- [`V0.8D_DEV_ONLY_JSONL_AUDIT_STORAGE_PROTOTYPE.md`](V0.8D_DEV_ONLY_JSONL_AUDIT_STORAGE_PROTOTYPE.md) — disabled-by-default dev-only JSONL audit storage utility.
- [`V0.8E_DEV_ONLY_AUDIT_CLI.md`](V0.8E_DEV_ONLY_AUDIT_CLI.md) — local-only CLI for manually writing sanitized audit records to dev JSONL storage.
- [`V0.8F_STAGING_REPLAY_CLOSEOUT.md`](V0.8F_STAGING_REPLAY_CLOSEOUT.md) — staging-style sanitized audit replay fixture and audit export closeout.
- [`V0.9_AUDIT_REVIEW_REPORT_GENERATION.md`](V0.9_AUDIT_REVIEW_REPORT_GENERATION.md) — Markdown audit review report generator.
- [`V0.9B_LOCAL_AUDIT_REPORT_ARTIFACT.md`](V0.9B_LOCAL_AUDIT_REPORT_ARTIFACT.md) — disabled-by-default local Markdown report artifact option.
- [`V0.10_HUMAN_SIGNOFF_REVIEW_WORKFLOW.md`](V0.10_HUMAN_SIGNOFF_REVIEW_WORKFLOW.md) — local human sign-off review package generator.
- [`V0.11_DEV_ONLY_SIGNOFF_DECISION_LEDGER.md`](V0.11_DEV_ONLY_SIGNOFF_DECISION_LEDGER.md) — dev-only human decision record, local JSONL ledger, and ledger summary report.

## Release notes / open-source readiness

- [`RELEASE_NOTES_V1_0_RC.md`](RELEASE_NOTES_V1_0_RC.md) — copy-ready v1.0 release-candidate notes.
- [`RELEASE_NOTES_V0_13_RC.md`](RELEASE_NOTES_V0_13_RC.md) — V0.13 local demo release-candidate notes.
- [`RELEASE_NOTES_V0_14_PRESENTATION_POLISH.md`](RELEASE_NOTES_V0_14_PRESENTATION_POLISH.md) — V0.14 presentation polish notes.
- [`OPEN_SOURCE_RELEASE_CHECKLIST.md`](OPEN_SOURCE_RELEASE_CHECKLIST.md) — checklist before tagging an open-source release candidate.
- [`GITHUB_PRESENTATION_CHECKLIST.md`](GITHUB_PRESENTATION_CHECKLIST.md) — checklist for keeping the GitHub repository presentation accurate and resume-ready.

## Portfolio / project explanation

- [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md) — one-page project brief for recruiters, interviewers, and portfolio readers.
- [`PORTFOLIO_CASE_STUDY.md`](PORTFOLIO_CASE_STUDY.md) — product-management-style case study.

## Earlier n8n / Codex notes

- [`agent-workflow-architecture.md`](agent-workflow-architecture.md)
- [`n8n-codex-workflow-runbook.md`](n8n-codex-workflow-runbook.md)
- [`n8n-security-checklist.md`](n8n-security-checklist.md)
