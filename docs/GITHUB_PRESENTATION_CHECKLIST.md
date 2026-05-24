# GITHUB_PRESENTATION_CHECKLIST

Use this checklist before sharing the repository in a resume, portfolio, GitHub profile, interview, or project review.

## README first screen

- [ ] The first 5 lines explain what the project is.
- [ ] The README says this is a goal-driven Agent workflow MVP.
- [ ] The README clearly mentions n8n.
- [ ] The README explains that the project is mock-first.
- [ ] The README does not claim real provider integration if it is not implemented.
- [ ] Badges are static or truthful.

## Architecture and product framing

- [ ] The README includes an architecture diagram.
- [ ] The diagram shows Master, Executor, Checker, Error Handler, and manual approval / safety boundary.
- [ ] The problem statement explains why Agent workflows need criteria, validation, error handling, and stop conditions.
- [ ] The project is framed as workflow orchestration, not a simple chatbot.

## Reproducibility

- [ ] Quick Start uses only scripts that exist in `package.json`.
- [ ] `npm test` is documented.
- [ ] `npm run workflow:validate:all` is documented.
- [ ] `npm run workflow:dry-run` is documented.
- [ ] `npm run import:check` is documented.
- [ ] Manual payload files are linked or listed.

## n8n import readiness

- [ ] The import order is clear.
- [ ] `docs/IMPORT_ORDER.md` is linked.
- [ ] `docs/MANUAL_IMPORT_CHECKLIST.md` is linked.
- [ ] The README states that workflow exports are inactive by default.
- [ ] The README reminds users to verify sub-workflow bindings after import.

## Examples and validation evidence

- [ ] `examples/sample_goal_request.json` is mentioned.
- [ ] `examples/manual-test-payloads/` is mentioned.
- [ ] Missing goal and missing criteria cases are documented.
- [ ] High-risk approval behavior is documented.
- [ ] Error Handler behavior is documented without overstating production deployment.

## Safety boundaries

- [ ] No real API key appears in README or docs.
- [ ] `.env.example` is described as placeholders only.
- [ ] Real provider access is marked as planned or future work.
- [ ] Manual approval is described as a safety boundary.
- [ ] `max_iterations` and `timeout_minutes` are mentioned.
- [ ] Public webhook exposure is not presented as safe without authentication.

## Accuracy and positioning

- [ ] The repository does not claim to be ready for production use unless it truly is.
- [ ] The repository does not claim real users, revenue, performance data, or deployments without evidence.
- [ ] Roadmap items are clearly labeled as planned.
- [ ] The license status is accurate.
- [ ] The project value is explained in terms of product thinking, workflow contracts, and safety design.

## Portfolio readiness

- [ ] `docs/PROJECT_BRIEF.md` exists.
- [ ] `docs/PORTFOLIO_CASE_STUDY.md` exists.
- [ ] The project can be summarized in one paragraph for a resume.
- [ ] The documentation shows product definition, engineering validation, and operational awareness.
- [ ] A reviewer can understand what is implemented within five minutes.
