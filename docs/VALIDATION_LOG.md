# Validation Log

This log records important manual and local validation milestones for the GoalDriven n8n workflow MVP.

The current validation target is workflow contract, routing correctness, safety boundaries, and no-side-effect behavior. It is not a claim that the system performs autonomous production work.

## V0.3a Real-readonly Smoke Test

Result: **PASS**

Verified through the local n8n Production Webhook flow.

Observed response contract:

- Production Webhook: PASS
- `run_id` returned
- `task_id` returned
- `criteria_result` returned
- `next_action` returned
- `agent_result.status = needs_review`
- `agent_result.provider.mode = real-readonly`
- `agent_result.provider.name = real-readonly-stub`
- `agent_result.safety.requires_human_approval = true`

Execution path verified in `[GoalDriven] 02 Agent Task Executor`:

```text
When Executed by Another Workflow
→ Task Validator
→ Prompt Builder
→ Mode Router
→ Real-readonly Provider Adapter
→ Result Normalizer
→ Execution Logger
```

Side-effect check:

- no real API call
- no file write
- no Git modification
- no external write action

Important interpretation:

`criteria_result.criteria_met = false` is not a failure in the real-readonly stub phase. The stub does not create real artifacts, so the checker may correctly return incomplete or unknown criteria. The pass condition for this milestone is path correctness, contract compatibility, safety metadata, and no side effects.

## V0.3b Mode Router Regression

Result: **PASS**

### Root cause

`[GoalDriven] 02 Agent Task Executor` uses n8n Switch V3, but the Mode Router rules were still using an older condition shape:

```json
{
  "conditions": {
    "string": [
      {
        "value1": "={{ $json.provider_mode }}",
        "operation": "equal",
        "value2": "real-readonly"
      }
    ]
  }
}
```

Switch V3 expects filter-style conditions:

```json
{
  "conditions": {
    "options": {
      "caseSensitive": true,
      "leftValue": "",
      "typeValidation": "strict",
      "version": 1
    },
    "conditions": [
      {
        "leftValue": "={{ $json.provider_mode }}",
        "rightValue": "real-readonly",
        "operator": {
          "type": "string",
          "operation": "equals"
        }
      }
    ],
    "combinator": "and"
  }
}
```

The old condition format caused `mock` and `dry-run` requests to route incorrectly to `real-readonly`.

### Fix

- Updated Mode Router rules to Switch V3 filter conditions.
- Set `mode = rules`.
- Set `fallbackOutput = 2`.
- Kept the default fallback path as Mock Agent Adapter.
- Did not modify Master, Criteria Checker, or Error Handler.
- Did not connect a real provider or create credentials.

Final routing:

```text
real-readonly → Real-readonly Provider Adapter
dry-run       → Dry-run Provider Adapter
mock/default  → Mock Agent Adapter
```

### Regression results

- mock regression: PASS
- dry-run regression: PASS
- real-readonly regression: PASS
- high-risk approval gate: PASS
- missing goal validation: PASS
- missing criteria validation: PASS

Final execution paths:

- `mock` → Mock Agent Adapter
- `dry-run` → Dry-run Provider Adapter
- `real-readonly` → Real-readonly Provider Adapter
- high-risk request → blocked before executor
- invalid payload → blocked before executor

Local validation after the fix:

- `npm test`: PASS, 16/16 tests passed
- `npm run workflow:validate:all`: PASS, 0 warning / 0 error
- `npm run workflow:dry-run`: PASS
- `npm run import:check`: PASS

## Current Boundary

Current project status:

```text
V0.3b regression verified.
The project is still mock-first / dry-run / real-readonly stub.
It is not production autonomous execution.
No real provider write action is enabled.
```

Not enabled:

- real LLM provider execution
- real Codex execution
- file write
- shell execution
- Git modification
- external write action
- autonomous production execution

## V0.4e Runtime Regression Verification

Result: **PASS**

This verification was completed against the local n8n Production Webhook runtime after syncing the V0.4d Executor workflow patch.

Important boundary:

V0.4e verifies routing, fallback behavior, and safety boundaries for the OpenAI-compatible real-readonly provider skeleton. It does not enable a real provider, create credentials, call a real API, or make the project production autonomous.

### Regression results

- mock regression: PASS
  - `agent_result.provider.mode = mock`
  - `agent_result.provider.name = mock-agent-adapter`
  - execution path confirmed: Mock Agent Adapter

- dry-run regression: PASS
  - `agent_result.provider.mode = dry-run`
  - `agent_result.provider.name = dry-run-provider`
  - `agent_result.dry_run_plan` exists

- real-readonly stub regression: PASS
  - `agent_result.provider.mode = real-readonly`
  - `agent_result.provider.name = real-readonly-stub`
  - `agent_result.status = needs_review`

- provider missing endpoint fallback: PASS
  - `provider_execution = provider`
  - `provider_error.code = provider_endpoint_missing`
  - `status = needs_review`
  - `safety.requires_human_approval = true`

- provider missing credential fallback: not separately verified
  - missing endpoint is checked first and safely blocks the provider path

- high-risk approval gate: PASS
  - `status = needs_human_approval`
  - blocked before executor dispatch

- missing goal validation: PASS
  - `status = invalid_request`
  - `validation_errors = ["goal is required"]`
  - rejected before task initialization

- missing criteria validation: PASS
  - `status = invalid_request`
  - `validation_errors = ["criteria must contain at least one item"]`
  - rejected before task initialization

### Provider skeleton execution path

The provider missing endpoint fallback path was confirmed in n8n execution history:

```text
Real-readonly Provider Selector
→ Real-readonly Safety Check
→ OpenAI-compatible Provider Request Builder
→ Provider Response Normalizer
→ Result Normalizer
→ Execution Logger
```

### Side-effect check

- no real API call
- no file write
- no shell execution
- no Git modification
- no external write action

### Current boundary after V0.4e

Current project status:

```text
V0.4e runtime regression verified.
The project still uses mock / dry-run / real-readonly stub plus a read-only provider skeleton.
No real provider credential is configured in the repository.
No production autonomous execution is enabled.
```
