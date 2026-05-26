# V0.4 Provider Integration Prep

This document prepares the next step after the V0.3 mock / dry-run / real-readonly stub validation.

V0.4 is **not** the start of autonomous execution. It is the preparation phase for a real provider adapter that can perform read-only analysis and return a normalized `agent_result`.

## 1. Goal

Design and prepare a controlled real-readonly provider integration for `[GoalDriven] 02 Agent Task Executor`.

The provider may analyze a goal and criteria, but it must not perform any action outside the workflow.

Allowed:

- generate a summary
- generate intended actions
- generate evidence
- generate risk summary
- return provider metadata
- return usage / latency metadata if available
- return `needs_review`

Not allowed:

- write files
- run shell commands
- modify Git
- call external write APIs
- auto-approve execution
- bypass human approval
- store or print API keys

## 2. Recommended first provider choice

Use one provider first. Do not add multiple real provider branches in the same step.

Recommended order:

1. OpenRouter-compatible HTTP provider
2. OpenAI-compatible HTTP provider
3. local HTTP agent
4. Codex manual-task adapter

Why this order:

- HTTP provider nodes are easy to reason about in n8n.
- The request and response can be explicitly normalized.
- The adapter can remain read-only.
- The existing `Result Normalizer` and Criteria Checker contracts can stay unchanged.

## 3. Credential convention

Do not put keys in workflow JSON, README, docs, examples, logs, or Git.

Recommended n8n credential names:

```text
goald-openrouter-readonly
goald-openai-readonly
goald-local-agent-readonly
```

Recommended non-secret provider config fields:

```json
{
  "provider_name": "openrouter",
  "provider_mode": "real-readonly",
  "credential_name": "goald-openrouter-readonly",
  "model": "configured-in-n8n-or-env",
  "timeout_ms": 30000,
  "max_tokens": 1200,
  "cost_limit_note": "manual budget guard; not enforced in V0.4 prep"
}
```

The credential name may appear in documentation or workflow notes. The secret value must only live in n8n Credentials or a local ignored environment file.

## 4. Proposed n8n node change

Only `[GoalDriven] 02 Agent Task Executor` should change in the first implementation.

Do not modify:

- `[GoalDriven] 01 Master`
- `[GoalDriven] 03 Criteria Checker`
- `[GoalDriven] 04 Error Handler`

Proposed structure:

```text
When Executed by Another Workflow
→ Task Validator
→ Prompt Builder
→ Mode Router
   ├─ Mock Agent Adapter
   ├─ Dry-run Provider Adapter
   └─ Real-readonly Provider Adapter
        ├─ Real-readonly Safety Check
        ├─ Real Provider HTTP Call
        └─ Provider Response Normalizer
→ Result Normalizer
→ Execution Logger
```

The existing real-readonly stub should remain available as fallback until the real provider path has passed regression testing.

## 5. Real-readonly safety check

Before any real provider call, the adapter must check:

- `provider_mode = real-readonly`
- `risk_level` is not high unless explicitly approved
- `human_approved = true` if the path requires approval
- no request asks for shell execution
- no request asks for file write
- no request asks for Git modification
- no request asks for external write action

If blocked, return a structured `agent_result` instead of proceeding:

```json
{
  "status": "needs_review",
  "summary": "Real-readonly provider call blocked by safety check.",
  "artifacts": [],
  "known_issues": ["Request requires human review before provider analysis."],
  "evidence": [],
  "provider": {
    "mode": "real-readonly",
    "name": "blocked-before-provider",
    "model": null,
    "request_id": null,
    "latency_ms": 0
  },
  "safety": {
    "risk_level": "medium",
    "requires_human_approval": true,
    "approved": false,
    "blocked_reason": "safety_check_failed"
  }
}
```

## 6. Provider request shape

The request sent to the provider must instruct read-only behavior:

```json
{
  "mode": "real-readonly",
  "goal": "...",
  "criteria": ["..."],
  "iteration": 1,
  "constraints": [
    "Do not execute commands.",
    "Do not write files.",
    "Do not modify Git.",
    "Do not call external write APIs.",
    "Return structured JSON only."
  ],
  "return_schema": {
    "summary": "string",
    "intended_actions": ["string"],
    "evidence": [
      {
        "criterion": "string",
        "status": "pass | fail | unknown",
        "detail": "string"
      }
    ],
    "risk_summary": "string"
  }
}
```

## 7. Provider response normalizer

The real provider response must be converted into the existing `agent_result` contract:

```json
{
  "run_id": "...",
  "task_id": "...",
  "status": "needs_review",
  "summary": "...",
  "artifacts": [],
  "known_issues": [],
  "evidence": [],
  "intended_actions": [],
  "risk_summary": "...",
  "provider": {
    "mode": "real-readonly",
    "name": "...",
    "model": "...",
    "request_id": "...",
    "latency_ms": 0
  },
  "safety": {
    "risk_level": "low | medium | high",
    "requires_human_approval": true,
    "approved": false,
    "blocked_reason": null
  }
}
```

Do not let provider-specific response shapes leak into Criteria Checker.

## 8. Test payload

Use a new payload only after the implementation exists:

```json
{
  "goal": "Generate a read-only provider analysis plan for the GoalDriven workflow",
  "criteria": [
    "Output must include summary",
    "Output must include intended_actions",
    "Output must include evidence",
    "Output must include risk_summary",
    "Output must not execute real actions"
  ],
  "agent_mode": "real-readonly",
  "provider_mode": "real-readonly",
  "max_iterations": 1,
  "timeout_minutes": 5,
  "risk_level": "low",
  "require_human_approval": false,
  "manual_approval_required": false,
  "human_approved": true,
  "context": {
    "agent_mode": "real-readonly",
    "provider_mode": "real-readonly",
    "provider_name": "openrouter",
    "provider_execution": "readonly"
  }
}
```

Expected result:

- `agent_result.status = needs_review`
- `agent_result.provider.mode = real-readonly`
- `agent_result.summary` exists
- `agent_result.intended_actions` exists
- `agent_result.evidence` exists
- `agent_result.risk_summary` exists
- no file write
- no shell execution
- no Git modification
- no external write action

## 9. Regression checklist

After adding a real-readonly provider branch, rerun:

```bash
npm test
npm run workflow:validate:all
npm run workflow:dry-run
npm run import:check
```

Then validate through Production Webhook:

- mock regression
- dry-run regression
- real-readonly stub regression or fallback
- real-readonly provider regression
- high-risk approval gate
- missing goal validation
- missing criteria validation
- Error Handler failure path

## 10. Rollback plan

Before modifying n8n runtime:

1. Export `[GoalDriven] 02 Agent Task Executor`.
2. Name the backup:

   ```text
   agent_task_executor-before-v04-provider-test.json
   ```

3. Update only the existing 02 workflow.
4. Do not create a duplicate workflow.
5. Do not change Master binding unless evidence shows it points to the wrong workflow.

If validation fails:

1. Restore the backup 02 workflow.
2. Publish 02 again.
3. Run mock regression.
4. Run dry-run regression.
5. Run real-readonly stub regression.
6. Confirm Master still calls the same 02 workflow.

## 11. Go / No-Go

Go only if:

- V0.3b regression remains green
- provider credential is stored outside Git
- provider branch is read-only
- mock and dry-run remain unchanged
- Criteria Checker does not need to change
- rollback backup exists

No-Go if:

- the provider requires exposing an API key in JSON
- the provider branch requires shell/file/Git actions
- the provider output cannot be normalized
- high-risk approval can be bypassed
- workflow validation produces warnings or errors
