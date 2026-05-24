# Project Brief: Goal-Driven Agent Workflow with n8n

## One-line summary

A mock-first n8n workflow MVP that turns AI Agent work into a goal-driven execution loop with explicit criteria, bounded execution, result checking, error handling, and human approval boundaries.

## Background

Many Agent prototypes focus on prompting a model to perform a task. In practice, the harder product problem is controlling the loop around the model:

- What is the goal?
- How is success evaluated?
- What happens when output is incomplete?
- How does the system stop?
- How are errors recovered?
- Where does a human approve high-risk actions?

This project explores those questions through n8n workflow orchestration rather than through a single prompt or one-off script.

## Target user / scenario

The target user is a builder, AI product manager, automation designer, or small technical team that wants a reusable pattern for goal-driven Agent workflows.

Example scenarios include:

- turning a vague goal into a bounded task run
- checking output against acceptance criteria
- generating the next iteration instruction when results are incomplete
- testing workflow contracts before connecting real LLM providers
- preparing a safe path toward coding-agent, knowledge-base, or internal-process integrations

## Key product insight

Agent automation becomes more useful when it is treated as a controlled workflow system:

```text
goal → criteria → execution → evidence → checker → next action
```

The product value is not only in task execution. It is in the control plane around execution: validation, stopping rules, failure recovery, and human approval.

## Core workflow

The MVP is split into four n8n workflows:

1. `[GoalDriven] 01 Master`
   - receives the goal payload
   - validates required fields
   - initializes `run_id` and `task_id`
   - coordinates executor and checker calls
   - returns final status and next action

2. `[GoalDriven] 02 Agent Task Executor`
   - receives a bounded task
   - supports `mock`, `dry-run`, and `real-readonly` stub modes
   - returns a normalized `agent_result`

3. `[GoalDriven] 03 Criteria Checker`
   - evaluates evidence against criteria
   - produces pass/fail/unknown checks
   - recommends whether to accept, revise, or stop

4. `[GoalDriven] 04 Error Handler`
   - starts with an Error Trigger
   - normalizes failure context
   - returns recovery guidance

## MVP scope

Included:

- workflow JSON managed as code
- mock-first execution path
- dry-run and real-readonly stub support in the executor
- workflow validation scripts
- import readiness check
- sample payloads
- local tests for schemas, scoring, and workflow contracts
- manual import checklist
- runbook and production readiness checklist

Not included:

- real LLM provider calls
- real Codex automation
- persistent database-backed run history
- public hosted deployment
- dashboard UI
- multi-user permissions

## Engineering validation

The repository includes these validation commands:

```bash
npm test
npm run workflow:validate:all
npm run workflow:dry-run
npm run import:check
```

The validation strategy checks:

- payload schemas
- criteria scoring behavior
- workflow JSON validity
- inactive-by-default exports
- missing workflow connections
- import readiness and binding reminders

## Safety design

The project keeps safety boundaries visible:

- no real API keys in workflow JSON
- `.env.example` uses placeholder variable names only
- workflows are inactive in the repository exports
- dry-run mode does not send real API requests
- real-readonly mode is currently a stub
- `max_iterations` and `timeout_minutes` are documented as stop boundaries
- high-risk payloads are routed through a human approval concept
- Error Handler behavior is documented and verified through automatic failure triggering

## Current limitations

- The MVP is not connected to a real LLM provider.
- The real-readonly provider path is a stub, not an actual provider call.
- n8n UI import and binding still require human verification.
- Execution history is not persisted in a separate database.
- There is no web dashboard for monitoring.
- Cross-instance n8n imports may require re-selecting sub-workflow bindings.

## Next milestones

Recommended next steps:

1. Manually validate the real-readonly stub in n8n UI.
2. Add a real provider adapter in read-only mode only.
3. Preserve the `agent_result` contract for Criteria Checker compatibility.
4. Add persistent run history.
5. Add a human approval UI.
6. Add evaluation reports and observability.
7. Explore Codex / coding-agent and RAG adapters behind the same workflow contract.

## What this project demonstrates about the builder

This project demonstrates the ability to:

- translate a vague Agent concept into a structured workflow system
- define product-level success criteria
- separate orchestration, execution, checking, and error handling
- design mock-first validation before provider integration
- document operational and safety boundaries
- build a GitHub-ready project that is reproducible, reviewable, and extensible

It is a practical AI Agent infrastructure prototype rather than a claim of full autonomy.
