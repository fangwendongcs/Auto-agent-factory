# Portfolio Case Study

## 1. Context

AI Agent workflows are often presented as a single prompt, a single automation, or a model call wrapped in a script. That approach is fast for demos, but it is difficult to evaluate, recover, and scale safely.

This project explores a more productized pattern: use n8n as the orchestration layer for a goal-driven Agent workflow, where each run has explicit goals, criteria, execution boundaries, validation, and error handling.

## 2. Problem Definition

The core problem is not simply “how to call an AI model.” The harder problem is how to make Agent work:

- controllable
- measurable
- reproducible
- recoverable
- safe enough to evolve toward real providers

Without these boundaries, Agent systems can become difficult to trust:

- a model may produce output without evidence
- “done” may not match user expectations
- failure may be invisible or hard to debug
- retry loops may waste cost and time
- high-risk tasks may proceed without human review

## 3. Design Principles

### Goal-first

The workflow starts with a `goal`, not a provider call. This keeps execution tied to user intent.

### Criteria-driven validation

Every run includes explicit `criteria`. The checker evaluates output against those criteria rather than accepting a generic completion message.

### Mock-first implementation

The MVP validates contracts, workflow shape, and testing paths before connecting a real LLM or coding agent. This reduces integration risk.

### Human-in-the-loop

High-risk payloads and future real execution paths must preserve human review boundaries.

### Fail-safe workflow

Errors are handled by a dedicated Error Handler workflow rather than being hidden inside the main path.

### Reproducible import and testing

Workflow JSON, sample payloads, validation scripts, runbooks, and import checklists are stored in Git.

## 4. MVP Design

The MVP is organized around four workflows:

| Workflow | Role |
|---|---|
| `[GoalDriven] 01 Master` | Orchestrates request validation, task initialization, executor dispatch, criteria routing, and final response. |
| `[GoalDriven] 02 Agent Task Executor` | Produces a bounded task result through mock, dry-run, or real-readonly stub modes. |
| `[GoalDriven] 03 Criteria Checker` | Checks evidence against criteria and determines whether more work is needed. |
| `[GoalDriven] 04 Error Handler` | Receives workflow failure context and generates recovery guidance. |

The workflow split makes the system easier to inspect, test, import, and evolve.

## 5. User Journey / Execution Flow

```text
User submits goal + criteria
        ↓
Master validates payload
        ↓
Master checks safety boundary / approval requirement
        ↓
Master creates run_id and task_id
        ↓
Executor returns normalized agent_result
        ↓
Criteria Checker evaluates evidence
        ↓
Master decides next_action
        ↓
Final response, retry instruction, approval block, or error recovery
```

The MVP does not claim to run long autonomous tasks. It focuses on proving the execution loop and contract boundaries.

## 6. Validation Strategy

The project includes local validation commands from `package.json`:

```bash
npm test
npm run workflow:validate:all
npm run workflow:dry-run
npm run import:check
```

Each command has a specific purpose:

- `npm test` checks schema behavior, criteria scoring, and workflow contract assumptions.
- `npm run workflow:validate:all` validates all official workflow JSON files.
- `npm run workflow:dry-run` checks the deployment path without sending a real n8n API request.
- `npm run import:check` verifies import readiness and reminds the user to check sub-workflow bindings.

Manual payload tests cover:

- valid goal payload
- missing goal
- missing criteria
- high-risk approval blocking
- dry-run mode
- real-readonly stub mode

## 7. Risk Control

The project explicitly treats risk as part of the product design.

### Cost and time

- `max_iterations` is documented as a bounded execution control.
- `timeout_minutes` is documented as a stop boundary.
- The MVP does not run autonomous long loops.

### Secrets

- API keys are not written into workflow JSON.
- `.env.example` contains only placeholder variable names.
- Real provider credentials are planned for n8n Credentials or local environment variables.

### Production activation

- Workflow exports are inactive by default.
- Production Webhook usage is documented as a manual validation step, not a public deployment claim.
- Public webhook exposure is listed as a future readiness concern.

### Human approval

- High-risk payload behavior is documented and tested through manual workflow validation.
- Future real-provider execution must preserve a human approval boundary.

## 8. Current Status

Current repository status:

- MVP
- mock-first
- import-ready workflow JSON
- four official n8n workflows
- local validation scripts
- dry-run deployment check
- real-readonly stub path in the executor
- production readiness and provider adapter design documents

Not current status:

- not connected to a real LLM provider
- not a hosted production service
- not an unrestricted autonomous Agent system
- not a performance-claims system

## 9. Future Work

Planned directions:

- connect a real provider in read-only mode
- add persistent run history
- add a monitoring dashboard
- add a human approval UI
- integrate a coding-agent adapter
- integrate RAG or project knowledge context
- generate evaluation reports across workflow runs
- improve cross-instance n8n migration tooling

## 10. PM Takeaways

This project demonstrates a product management approach to Agent systems:

- turning a vague Agent idea into a defined workflow product
- designing acceptance criteria before execution
- separating happy path, retry path, and error path
- controlling cost, risk, and operational ambiguity
- documenting the system so another person can import, test, and extend it

The core takeaway: useful Agent products are not just model calls. They are systems with contracts, feedback loops, safety boundaries, and recovery paths.
