# ADR 0001: Real-readonly Provider Adapter Selection

Status: Accepted for V0.4 planning  
Date: 2026-05-27

## Context

The project has completed the V0.3 mock-first validation path:

- `mock` mode is verified
- `dry-run` mode is verified
- `real-readonly` stub mode is verified
- high-risk approval blocking is verified
- invalid payload validation is verified
- Error Handler behavior has been verified

The next step is to design the first real provider adapter without enabling autonomous execution.

The adapter must preserve the existing workflow contract:

```text
Provider response
→ Provider Response Normalizer
→ Result Normalizer
→ agent_result
→ Criteria Checker
```

The Criteria Checker must remain provider-agnostic.

## Decision

For V0.4, the first real provider integration target is:

```text
OpenAI-compatible HTTP interface
```

This is an interface decision, not a vendor lock-in decision.

The concrete runtime provider may later be:

- OpenRouter-compatible endpoint
- OpenAI-compatible endpoint
- local OpenAI-compatible HTTP agent
- another provider exposed behind the same request / response shape

The workflow should treat all of these as a single adapter family:

```text
real-readonly-openai-compatible
```

## Why this choice

An OpenAI-compatible HTTP interface is a practical first adapter target because:

- it is easy to represent in n8n HTTP Request nodes
- request / response shapes are familiar and easy to normalize
- many hosted and local providers can expose a compatible interface
- the adapter can stay read-only
- the provider can be swapped without changing Criteria Checker
- the workflow can continue to keep `mock` and `dry-run` as fallback paths

This project is not choosing a model vendor yet. It is choosing the smallest stable adapter shape.

## Non-goals

V0.4 does not include:

- production autonomous execution
- file writes
- shell execution
- Git modification
- external write API calls
- tool-calling execution
- long-running agent loops
- automatic merge / deploy / publish actions
- storing API keys in workflow JSON or Git

## Adapter mode

The provider must run only under:

```text
provider_mode = real-readonly
```

It must return:

```json
{
  "status": "needs_review",
  "summary": "...",
  "intended_actions": [],
  "evidence": [],
  "risk_summary": "...",
  "provider": {
    "mode": "real-readonly",
    "name": "openai-compatible-readonly",
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

The output must remain `needs_review`. The adapter must not convert analysis into execution.

## Credential convention

Recommended n8n credential names:

```text
goald-openai-compatible-readonly
goald-openrouter-readonly
goald-local-agent-readonly
```

Rules:

- no API key in workflow JSON
- no API key in README
- no API key in docs
- no API key in examples
- no API key in logs
- no API key in Git

The workflow may reference a credential by name, but the secret value must live only in n8n Credentials or a local ignored environment file.

## Planned n8n change

The first implementation should modify only:

```text
workflows/agent_task_executor.workflow.json
```

It should not modify:

```text
workflows/goal_driven_master.workflow.json
workflows/criteria_checker.workflow.json
workflows/error_handler.workflow.json
```

Planned Executor shape:

```text
When Executed by Another Workflow
→ Task Validator
→ Prompt Builder
→ Mode Router
   ├─ Mock Agent Adapter
   ├─ Dry-run Provider Adapter
   └─ Real-readonly Provider Adapter
        ├─ Real-readonly Safety Check
        ├─ OpenAI-compatible HTTP Request
        └─ Provider Response Normalizer
→ Result Normalizer
→ Execution Logger
```

The current `Real-readonly Provider Adapter` stub should remain available until the real provider branch has passed regression tests.

## Request contract

The provider request must instruct read-only behavior:

```json
{
  "mode": "real-readonly",
  "goal": "...",
  "criteria": ["..."],
  "constraints": [
    "Do not execute commands.",
    "Do not write files.",
    "Do not modify Git.",
    "Do not call external write APIs.",
    "Return structured JSON only."
  ],
  "expected_output": {
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

## Failure behavior

If the provider fails, times out, or returns invalid JSON, the adapter must return a structured failure result when possible:

```json
{
  "status": "failed",
  "summary": "Real-readonly provider call failed before execution.",
  "known_issues": ["provider_error"],
  "evidence": [],
  "provider": {
    "mode": "real-readonly",
    "name": "openai-compatible-readonly",
    "model": "...",
    "request_id": null,
    "latency_ms": 0
  },
  "safety": {
    "risk_level": "medium",
    "requires_human_approval": true,
    "approved": false,
    "blocked_reason": "provider_error"
  }
}
```

If the n8n node itself fails before normalization, the Error Handler should capture the failed execution.

## Acceptance criteria

V0.4 implementation may be accepted only if:

- `mock` regression still passes
- `dry-run` regression still passes
- `real-readonly stub` remains available or has an explicit fallback
- real provider path returns `needs_review`
- real provider path does not write files
- real provider path does not execute shell commands
- real provider path does not modify Git
- real provider path does not call external write APIs
- no secret is committed
- Criteria Checker does not change
- Error Handler still works
- `npm test` passes
- `npm run workflow:validate:all` passes with `0 warning / 0 error`
- `npm run workflow:dry-run` passes
- `npm run import:check` passes

## Consequences

Positive:

- provider choice remains flexible
- real-readonly path can be tested without changing Master or Checker
- existing mock / dry-run safety baselines remain useful
- future local and hosted providers can share one adapter family

Tradeoffs:

- the first real provider branch still requires careful n8n UI credential setup
- provider-specific response quirks must be normalized
- this does not yet create a full autonomous agent

## Next implementation step

Prepare a minimal Executor-only patch that adds a disabled or manually gated OpenAI-compatible HTTP provider branch.

Do not connect a real credential until the workflow diff, request shape, response normalizer, and rollback plan are reviewed.
