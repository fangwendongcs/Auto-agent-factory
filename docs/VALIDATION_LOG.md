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

## V0.5b Real Provider Sandbox Call

Result: **PASS**

This verification was completed by the user against the local n8n Production Webhook runtime after syncing the V0.5b Executor workflow update.

Important boundary:

V0.5b verifies one real provider sandbox call through the OpenAI-compatible real-readonly path. It does not enable production autonomous execution, file writes, shell execution, Git modification, external write actions, or automatic approval.

### Provider configuration observed at runtime

- `provider_runtime_endpoint = https://api.deepseek.com`
- `provider_runtime_model = deepseek-v4-flash`
- `provider_config.endpoint_configured = true`
- `provider_config.model_configured = true`
- `credential_ready = true`
- `provider_call_status = response_received`

No real API key was shared with Codex or written to the repository.

### Normalized provider result

- `agent_result.status = needs_review`
- `agent_result.provider.mode = real-readonly`
- `agent_result.provider.name = openai-compatible-readonly`
- `agent_result.provider.model = deepseek-v4-flash`
- `agent_result.summary` exists
- `agent_result.intended_actions` exists
- `agent_result.evidence` exists
- `agent_result.risk_summary` exists
- `agent_result.safety.requires_human_approval = true`

### Safety status

- provider success still returns `needs_review`
- human approval remains required for risky operations
- provider output cannot trigger execution
- no file write
- no shell execution
- no Git modification
- no external write action
- no production autonomous execution

### Known issue

Criteria Checker still reports `criteria_met = false` for the provider sandbox result and may produce messages such as:

```text
No evidence provided for criterion
```

This is not treated as a V0.5b blocker because the provider path successfully returned a normalized `agent_result` with summary, intended actions, evidence, risk summary, provider metadata, and safety metadata.

Likely next area:

```text
V0.5c regression + evaluator/checker alignment
```

The Criteria Checker should be reviewed to ensure it reads provider-normalized `agent_result.evidence`, `summary`, `intended_actions`, and `risk_summary` consistently. Do not expand this into execution or write capabilities.

### Current boundary after V0.5b

Current project status:

```text
V0.5b real provider sandbox success path verified.
The project is still read-only first.
It is not production autonomous execution.
No file write, shell execution, Git modification, or external write action is enabled.
```

## V0.5c Criteria Checker Runtime Alignment

Result: **PASS**

This runtime verification addresses the known V0.5b issue where Criteria Checker could report:

```text
No evidence provided for criterion
```

even when the real provider sandbox path returned normalized `agent_result.evidence`.

### Root cause

The Criteria Checker primarily matched evidence with strict criterion text equality:

```text
entry.criterion === criterion
```

Real provider evidence may use shorter labels such as `summary`, `intended_actions`, `evidence`, or `risk_summary`, while the input criteria may be phrased as full acceptance statements such as `Output must include summary`.

### Patch

`[GoalDriven] 03 Criteria Checker` now supports:

- exact criterion matching
- normalized text matching
- index-based fallback matching
- provider context fallback from:
  - `agent_result.summary`
  - `agent_result.intended_actions`
  - `agent_result.risk_summary`

The checker also records:

- `match_type`
- `provider_evidence_criterion`
- `checker_log.evidence_items_seen`
- `checker_log.provider_context_available`

### Boundary

This patch only changes evaluation alignment. It does not enable:

- file write
- shell execution
- Git modification
- external write action
- automatic approval
- production autonomous execution

### Runtime verification result

- `criteria_result.checks[].match_type` appears
- `criteria_result.checks[].provider_evidence_criterion` appears
- `checker_log.evidence_items_seen = 8`
- `checker_log.provider_context_available = true`
- the checker no longer returns the previous all-missing-evidence behavior

### Known issue after V0.5c

`criteria_met = false` may still occur because provider evidence and acceptance criteria can remain semantically misaligned. Current matching can rely on `index_fallback`, which is acceptable for V0.5c runtime alignment but should be improved in the next evaluator quality phase.

Recommended next phase:

```text
V0.6 evaluator quality / reliability / safety hardening
```

The next phase should improve criteria/evidence quality without enabling file writes, shell execution, Git modification, external write actions, automatic approval, or production autonomous execution.

## V0.6b Provider Prompt Refinement

Result: **REPO-SIDE PATCH PREPARED**

This update refines the OpenAI-compatible read-only provider request contract so provider evidence can be aligned with input criteria more reliably.

### Patch summary

`[GoalDriven] 02 Agent Task Executor` now asks the provider to return criterion-indexed evidence using:

- `criteria_items[]`
- `criterion_id`
- `criterion`
- `status = pass | fail | unknown`
- `detail`
- `confidence`
- `supports_fields`
- `limitations`

`Provider Response Normalizer` now preserves these evaluator-quality fields in normalized evidence where available, while keeping backward compatibility with the existing `agent_result.evidence[]` contract.

### Boundary

This patch does not enable:

- file write
- shell execution
- Git modification
- external write action
- automatic approval
- production autonomous execution

Provider success still returns `needs_review`, and provider output remains review material rather than executable authority.

### Runtime note

This is a repository-side workflow patch. After importing or syncing `[GoalDriven] 02 Agent Task Executor` into n8n, the next runtime verification should confirm that a real provider sandbox response includes criterion-indexed evidence and that Criteria Checker can distinguish stronger matches from fallback matches.


## V0.6c Runtime Verification

Result: **PASS**

This verification was completed manually by the user against the local n8n Production Webhook runtime after syncing the V0.6b Executor workflow patch.

Important boundary:

V0.6c verifies read-only provider evidence quality and Criteria Checker alignment. It does not enable production autonomous execution, file writes, shell execution, Git modification, external write actions, Codex execution, or automatic approval.

### Real provider sandbox result

- real provider call: PASS
- `provider_call_status = response_received`
- `provider_runtime_model = deepseek-v4-flash`
- `agent_result.status = needs_review`
- `agent_result.provider.mode = real-readonly`
- `agent_result.provider.name = openai-compatible-readonly`
- `agent_result.safety.requires_human_approval = true`

No real API key was shared with Codex or written to the repository.

### V0.6b evidence contract observed at runtime

- `provider_request.criteria_items[]` exists
- `evaluator_contract_version = v0.6b-criterion-indexed-evidence`
- `agent_result.evidence[].criterion_id` exists
- `agent_result.evidence[].confidence` exists
- `agent_result.evidence[].supports_fields` exists
- `agent_result.evidence[].limitations` exists

### Criteria Checker alignment result

- `criteria_result.criteria_met = true`
- `criteria_result.score = 1`
- `criteria_result.checks[].match_type = exact`
- `criteria_result.checks[].provider_evidence_criterion` matches the original criteria
- `checker_log.failed_criteria = 0`
- `checker_log.provider_context_available = true`
- `next_action = stop`

### Safety status

- provider success still returns `needs_review`
- human approval remains retained for risky operations
- provider output cannot trigger writes
- no file write
- no shell execution
- no Git modification
- no external write action
- no production autonomous execution

### Current boundary after V0.6c

Current project status:

```text
V0.6c Real Provider Read-only Sandbox + Evaluator Alignment Verified.
The project remains read-only first and is not production autonomous execution.
```

Recommended next phase:

```text
V0.7 Human-in-the-loop Controlled Execution Design / Safety Hardening
```

## V0.7 Controlled Execution Boundary Contract

Result: **REPO-SIDE PATCH PREPARED**

This update turns the V0.7 controlled execution boundary design into a Master workflow approval-decision contract.

### Patch summary

`[GoalDriven] 01 Master` now classifies incoming requests before executor dispatch using:

- `risk_level`
- `action_class`
- `permission_level`
- `forbidden_action_detected`
- `approval_decision`

Supported action classes:

- `read_only`
- `local_draft`
- `repo_write`
- `shell_command`
- `git_operation`
- `external_write`
- `deployment`

Default policies:

- `read_only`: may proceed after validation
- `local_draft`: may proceed as reviewable draft work
- `repo_write`: requires explicit human approval before dispatch
- `shell_command`: forbidden before controlled execution adapter exists
- `git_operation`: forbidden before controlled execution adapter exists
- `external_write`: forbidden before controlled execution adapter exists
- `deployment`: forbidden before controlled execution adapter exists

### Approval decision contract

Blocked and allowed paths now carry a structured `approval_decision` object with:

- `decision`
- `risk_level`
- `action_class`
- `permission_level`
- `requires_human_approval`
- `approved`
- `blocked`
- `reason`
- `approval_required_reason`
- `forbidden_reason`
- `approval_package`

### Boundary

This patch does not enable:

- file write
- shell execution
- Git modification
- external write action
- automatic approval
- production autonomous execution

Forbidden action classes are rejected before task initialization and before executor dispatch.

### Repo-side validation

Automated tests now cover:

- allowed read-only approval decision
- high-risk / repo-write request blocked without explicit approval
- forbidden shell command rejected before executor dispatch
- blocked response includes the approval decision contract

### Runtime note

This is a repository-side workflow patch. After syncing `[GoalDriven] 01 Master` into n8n, runtime verification should confirm:

- read-only payload returns `approval_decision.decision = allow`
- high-risk repo-write payload returns `status = needs_human_approval`
- forbidden shell-command payload returns `status = forbidden_request`
- blocked requests do not call `[GoalDriven] 02 Agent Task Executor`


## V0.7 Runtime Verification

Result: **PASS**

This verification was completed manually by the user against the local n8n Production Webhook runtime after syncing the V0.7 Master workflow patch.

Important boundary:

V0.7 verifies approval-boundary decisions before executor dispatch. It does not enable file writes, shell execution, Git modification, external write actions, automatic approval, or production autonomous execution.

### Read-only allow

- result: PASS
- `action_class = read_only`
- `permission_level = read_only`
- `approval_decision.decision = allow`
- `approval_decision.blocked = false`
- `forbidden_action_detected = false`
- `status = completed`

Note: `criteria_met = false` in this read-only mock regression is not an approval-gate failure. It reflects expected mock executor behavior for one criterion.

### High-risk repo-write approval gate

- result: PASS
- `status = needs_human_approval`
- `action_class = repo_write`
- `permission_level = write_action`
- `approval_decision.decision = needs_human_approval`
- `approval_decision.blocked = true`
- `forbidden_action_detected = false`
- no `agent_result` returned
- blocked before Executor dispatch

### Forbidden shell-command rejection

- result: PASS
- `status = forbidden_request`
- `action_class = shell_command`
- `permission_level = forbidden`
- `forbidden_action_detected = true`
- `approval_decision.decision = forbidden`
- `approval_decision.blocked = true`
- `note = Forbidden action rejected before task initialization.`
- rejected before Executor dispatch

### Safety status

- blocked and forbidden requests do not enter Executor
- no file write enabled
- no shell execution enabled
- no Git modification enabled
- no external write action enabled
- no production autonomous execution enabled

### Current boundary after V0.7

Current project status:

```text
V0.7 Human-in-the-loop Controlled Execution Boundary Verified.
The project remains read-only first and does not enable production autonomous execution.
```

Recommended next phase:

```text
V0.8 staging-style pilot / audit logging / rollback design
```

## V0.7 Approval Semantics Patch

Result: **PASS**

This verification was completed manually by the user against the local n8n Production Webhook runtime after syncing the approval semantics patch to `[GoalDriven] 01 Master`.

### Root cause

The forbidden `shell_command` path correctly returned:

- `approval_decision.decision = forbidden`
- `approval_decision.blocked = true`

However, when the incoming payload included `human_approved = true`, the approval decision previously preserved that value as:

```text
approval_decision.approved = true
```

That was misleading for audit semantics. A forbidden action must remain unapproved even if the payload claims human approval.

### Runtime verification result

- `status = forbidden_request`
- `action_class = shell_command`
- `permission_level = forbidden`
- `forbidden_action_detected = true`
- `approval_decision.decision = forbidden`
- `approval_decision.blocked = true`
- `approval_decision.approved = false`
- `note = Forbidden action rejected before task initialization.`
- rejected before Executor dispatch

The response did not expose a top-level `human_approved = false` field. This is acceptable for the current public response contract because the authoritative audit field is `approval_decision.approved`, and it is now false.

### Safety status

- no Executor dispatch
- no real provider call
- no file write
- no shell execution
- no Git modification
- no external write action
- no production autonomous execution
