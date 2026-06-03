# DeepSeek V4 Pro Provider Setup

This guide describes how to configure the existing OpenAI-compatible `real-readonly` provider path for DeepSeek V4 Pro.

This is a configuration guide only. It does not enable autonomous write actions, shell execution, Git modification, file writes, or external write actions.

## Target provider configuration

| Setting | Value |
|---|---|
| Provider interface | OpenAI-compatible HTTP interface |
| Base URL | `https://api.deepseek.com` |
| Model | `deepseek-v4-pro` |
| Credential name | `goald-openai-compatible-readonly` |
| Endpoint path | `/chat/completions` |
| Execution mode | `real-readonly` |
| Expected status | `needs_review` |

## n8n credential setup

Create the credential in n8n UI:

1. Open n8n.
2. Go to **Credentials**.
3. Create a new **Header Auth** credential.
4. Use this credential name:

```text
goald-openai-compatible-readonly
```

5. Configure the header:

```text
Header Name: Authorization
Header Value: Bearer <YOUR_DEEPSEEK_API_KEY>
```

Do not paste the real API key into this repository, workflow JSON, docs, examples, tests, commit messages, screenshots, or prompts.

## Runtime config options

The executor can resolve provider endpoint and model from request/context fields or n8n runtime environment variables.

Recommended n8n environment variables:

```bash
OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com
OPENAI_COMPATIBLE_MODEL=deepseek-v4-pro
```

Alternative request/context overrides are supported for local testing:

```json
{
  "provider_execution": "provider",
  "provider_credential_ready": true,
  "context": {
    "provider_base_url": "https://api.deepseek.com",
    "provider_model": "deepseek-v4-pro",
    "provider_credential_name": "goald-openai-compatible-readonly"
  }
}
```

Do not include an API key in the payload.

## Local sandbox trigger

Generate the DeepSeek read-only sandbox payload without sending it:

```bash
npm run sandbox:deepseek:readonly
```

After local n8n is running, workflows are imported, and the credential exists in n8n, explicitly enable the local POST:

```bash
DEEPSEEK_SANDBOX_SEND_ENABLED=true \
N8N_TEST_WEBHOOK_URL=http://localhost:5678/webhook/<your-local-test-path> \
npm run sandbox:deepseek:readonly
```

The script does not read or send API keys. Authorization must come from n8n Credentials.

## Workflow nodes to verify

In `[GoalDriven] 02 Agent Task Executor`, verify these nodes:

| Node | Expected behavior |
|---|---|
| `Resolve Provider Runtime Config` | resolves `provider_runtime_endpoint` and `provider_runtime_model` from context/input/env |
| `Real-readonly Safety Check` | keeps provider execution read-only and blocks risky/write-like intent |
| `OpenAI-compatible Provider Request Builder` | builds a JSON-only request body using `provider_config.model` |
| `OpenAI-compatible Provider Call Router` | sends only when `provider_call_status = ready_to_send` |
| `OpenAI-compatible HTTP Request` | POSTs to `<base_url>/chat/completions` using n8n credential injection |
| `OpenAI-compatible Response Envelope` | wraps the provider response for normalization |
| `Provider Response Normalizer` | normalizes response into `agent_result` fields |

## Expected request behavior

The HTTP Request node should compute the URL as:

```text
https://api.deepseek.com/chat/completions
```

The request body should use:

```json
{
  "model": "deepseek-v4-pro"
}
```

alongside the existing JSON-only planning/evidence request contract.

Authorization must come from the n8n credential. The workflow JSON must not contain the real `Authorization` header value.

## Secret safety checklist

Before committing or pushing, confirm:

- [ ] no real API key is present in workflow JSON
- [ ] no real API key is present in README/docs/examples/tests
- [ ] no real Authorization/Bearer value appears in Git diff
- [ ] `.env` and `.env.local` are not tracked
- [ ] `.local-audit/` is not tracked
- [ ] credential export files are not committed
- [ ] provider raw full responses are not committed
- [ ] full prompt/message payloads are not committed

## Manual validation checklist

After syncing the workflow into n8n and publishing the Executor workflow:

- [ ] `provider_config.endpoint = https://api.deepseek.com`
- [ ] `provider_config.model = deepseek-v4-pro`
- [ ] `provider_config.endpoint_configured = true`
- [ ] `provider_config.model_configured = true`
- [ ] `provider_config.credential_name = goald-openai-compatible-readonly`
- [ ] `provider_config.credential_ready = true`
- [ ] provider call status becomes `response_received` for a successful sandbox call
- [ ] `agent_result.provider.mode = real-readonly`
- [ ] `agent_result.provider.name = openai-compatible-readonly`
- [ ] `agent_result.provider.model = deepseek-v4-pro`
- [ ] `agent_result.status = needs_review`
- [ ] `agent_result.safety.requires_human_approval = true`

## Boundary

DeepSeek V4 Pro provider configuration does not change the project into a production autonomous agent. It remains read-only and review-oriented. High-risk and forbidden actions must still be blocked before executor dispatch or require explicit human review.
