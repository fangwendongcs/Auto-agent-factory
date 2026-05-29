# Security Policy

Auto Agent Factory is a local-first AI Agent governance toolkit. It is not a hosted SaaS product and does not provide production authentication, authorization, or tenant isolation.

## Supported scope

Security reports are welcome for issues that affect this repository, including:

- accidental secret exposure in docs, examples, workflow JSON, scripts, or tests
- unsafe defaults that could enable shell, Git, file-write, or external write actions
- audit or sign-off tooling that stores raw prompts, provider raw responses, credentials, tokens, or private data
- workflow validation gaps that could hide active workflows or unsafe connections

## Not currently in scope

The project does not currently provide:

- hosted production service
- multi-user auth / RBAC
- production database
- production autonomous Agent execution
- browser-facing secret handling

Do not treat this repository as a production security boundary for real users.

## Secret handling rules

Never commit:

- `.env` or `.env.local`
- real API keys
- `Authorization` / `Bearer` values
- n8n API keys
- provider credential values
- provider raw full responses
- full prompt or provider message payloads
- private user data

Provider keys, if used for local sandbox testing, must stay in the user's own n8n Credentials or local environment and must not be copied into Git, docs, examples, or prompts.

## Reporting a vulnerability

Open a private security advisory if available on GitHub, or contact the maintainer through the repository's preferred private channel. Do not include working secrets in the report. Redact sensitive values and describe the affected file, line, and risk.

## Expected response

For valid reports, the maintainer should:

1. confirm the affected area,
2. remove or rotate exposed secrets if applicable,
3. add regression checks where practical,
4. document the mitigation.
