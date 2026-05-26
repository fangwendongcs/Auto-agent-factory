# V0.3a Real-readonly UI Verification

This checklist closes the gap between the repository state and the n8n runtime state for V0.3a.

Repository status:

- `[GoalDriven] 02 Agent Task Executor` includes `mock`, `dry-run`, and `real-readonly` paths.
- `Real-readonly Provider Adapter` is a stub.
- No real provider, API key, credential, file write, shell command, or Git operation is involved.

Runtime goal:

> Confirm that the n8n UI version of `[GoalDriven] 02 Agent Task Executor` matches the repository workflow and that Production Webhook execution can route through the `real-readonly` stub path.

## 1. Backup current Executor workflow

In n8n UI:

1. Open `[GoalDriven] 02 Agent Task Executor`.
2. Export or download the current workflow JSON.
3. Save it outside the repository or in a local ignored backup location.
4. Use a name such as:

```text
agent_task_executor-before-real-readonly-v03a.json
```

Do not overwrite `workflows/agent_task_executor.workflow.json` during this backup step.

## 2. Check whether the current n8n workflow already contains V0.3a

Open `[GoalDriven] 02 Agent Task Executor` and confirm these nodes exist:

- `Mode Router`
- `Mock Agent Adapter`
- `Dry-run Provider Adapter`
- `Real-readonly Provider Adapter`
- `Result Normalizer`
- `Execution Logger`

Expected path:

```text
When Executed by Another Workflow
→ Task Validator
→ Prompt Builder
→ Mode Router
   ├─ real-readonly → Real-readonly Provider Adapter
   ├─ dry-run → Dry-run Provider Adapter
   └─ mock → Mock Agent Adapter
→ Result Normalizer
→ Execution Logger
```

If these nodes and connections are already present, continue to publish and test.

## 3. Sync safely if the nodes are missing

Preferred approach:

1. Keep the existing `[GoalDriven] 02 Agent Task Executor` workflow open.
2. Update the existing workflow instead of creating a duplicate workflow.
3. Use the repository file as the source of truth:

```text
workflows/agent_task_executor.workflow.json
```

4. Preserve the existing workflow ID so `[GoalDriven] 01 Master` keeps calling the same Executor.
5. Save the workflow.

Avoid using an import flow that creates a second `[GoalDriven] 02 Agent Task Executor` unless there is no safe in-place update option.

If a duplicate workflow must be created:

1. Import the repository JSON as a new workflow.
2. Return to `[GoalDriven] 01 Master`.
3. Re-select the Executor in `Call '[GoalDriven] 02 Agent Task Executor'`.
4. Publish Master again.
5. Run the mock regression test before testing `real-readonly`.

## 4. Publish Executor

After syncing:

1. Save `[GoalDriven] 02 Agent Task Executor`.
2. Publish it in n8n UI.
3. Suggested version note:

```text
v0.3a-real-readonly-stub
```

The repository JSON remains `active=false` by design. The n8n runtime workflow may be published for local Production Webhook testing.

## 5. Production Webhook real-readonly test

Use the Production Webhook URL for `[GoalDriven] 01 Master`. Do not use `/webhook-test/...` for this verification.

Local default example:

```bash
curl -X POST "http://localhost:5678/webhook/goal-driven-master" \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Generate a read-only implementation plan for the GoalDriven workflow",
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
      "provider_mode": "real-readonly"
    }
  }'
```

## 6. Expected response checks

The Production Webhook response should include:

- `run_id`
- `task_id`
- `criteria_result`
- `next_action`

The Executor output should include `agent_result` with:

- `agent_result.status = needs_review`
- `agent_result.provider.mode = real-readonly`
- `agent_result.provider.name = real-readonly-stub`
- `agent_result.intended_actions` exists
- `agent_result.risk_summary` exists
- `agent_result.safety.requires_human_approval = true`
- `agent_result.evidence[*].status = unknown`

Also confirm:

- no real provider was called
- no real API key was used
- no file was written
- no shell command was executed
- no Git operation was performed

## 7. Execution history checks

Check these executions in n8n:

### `[GoalDriven] 01 Master`

Expected path:

```text
Webhook Trigger
→ Payload Validator
→ Approval or Invalid Router
→ Task Initializer
→ Agent Dispatcher
→ Call '[GoalDriven] 02 Agent Task Executor'
→ Criteria Router
→ Call '[GoalDriven] 03 Criteria Checker'
→ Criteria Met Router
→ Retry or Stop Reporter / Final Reporter
→ Response Node
```

### `[GoalDriven] 02 Agent Task Executor`

Expected path:

```text
When Executed by Another Workflow
→ Task Validator
→ Prompt Builder
→ Mode Router
→ Real-readonly Provider Adapter
→ Result Normalizer
→ Execution Logger
```

It should not route through `Mock Agent Adapter` or `Dry-run Provider Adapter` for this payload.

### `[GoalDriven] 03 Criteria Checker`

Expected output:

- `criteria_result.checks`
- `criteria_result.score`
- `criteria_result.criteria_met`
- `criteria_result.next_iteration_instruction`
- `criteria_result.should_stop`

## 8. Regression tests after real-readonly passes

After real-readonly passes, run three regressions through the same Production Webhook.

### Mock regression

Send a normal low-risk payload without `provider_mode` or with `provider_mode = mock`.

Expected:

- Master returns `run_id`, `task_id`, `criteria_result`, and `next_action`.
- Executor routes through `Mock Agent Adapter`.
- No real provider is called.

### Dry-run regression

Send `examples/manual-test-payloads/05-dry-run-mode.json`.

Expected:

- Executor routes through `Dry-run Provider Adapter`.
- `agent_result.provider.mode = dry-run`.
- `agent_result.dry_run_plan` exists.
- No real side effect occurs.

### High-risk approval regression

Send `examples/manual-test-payloads/04-high-risk-needs-approval.json`.

Expected:

- Response status indicates human approval is needed.
- Master does not dispatch Executor.
- No provider path runs.

## 9. Rollback if verification fails

If the verification fails:

1. Stop further testing.
2. Restore `[GoalDriven] 02 Agent Task Executor` from the backup JSON.
3. Save and publish the restored workflow.
4. Confirm Master still points to the restored 02 workflow.
5. Run the mock regression payload.
6. Only continue after Master → Executor → Checker works again.

If restoring creates a new workflow ID, re-select the Executor binding in `[GoalDriven] 01 Master` and publish Master again.

## 10. Verification record

Fill this table after the UI test is complete.

| Check | Expected | Actual | Pass |
|---|---|---|---|
| 02 workflow backed up | Backup JSON saved locally |  |  |
| 02 contains Real-readonly Provider Adapter | Node exists |  |  |
| 02 contains Result Normalizer | Node exists |  |  |
| 02 published | Published in n8n UI |  |  |
| real-readonly webhook response | `run_id`, `task_id`, `criteria_result`, `next_action` |  |  |
| Executor path | Mode Router → Real-readonly Provider Adapter → Result Normalizer → Execution Logger |  |  |
| `agent_result.provider.mode` | `real-readonly` |  |  |
| `agent_result.status` | `needs_review` |  |  |
| No real side effect | No API call, file write, shell command, or Git operation |  |  |
| mock regression | Still routes through Mock Agent Adapter |  |  |
| dry-run regression | Still routes through Dry-run Provider Adapter |  |  |
| high-risk regression | Still blocks before Executor |  |  |
