# n8n + Codex 工作流 Runbook

## 1. 配置 `.env`

先复制示例文件：

```bash
cp .env.example .env
```

然后按需填写：

```dotenv
N8N_BASE_URL=
N8N_API_KEY=
N8N_WORKFLOW_CREATE_ENDPOINT=/api/v1/workflows
N8N_DEPLOY_MODE=dry-run
N8N_TEST_WEBHOOK_URL=

OPENAI_API_KEY=
PLANNER_MODEL=
REVIEWER_MODEL=

GITHUB_TOKEN=
GITHUB_REPO=
GITHUB_OWNER=
```

注意：

- `.env` 不要提交到 Git
- 真实密钥不要写进 workflow JSON
- `N8N_DEPLOY_MODE` 默认保持 `dry-run`

## 2. 校验 workflow

```bash
node scripts/validate-n8n-workflow.mjs n8n/workflows/codex-planner-reviewer.workflow.json
```

你会看到：

- `PASS`
- `WARNINGS`
- `ERRORS`

只有在 `ERRORS` 为空时，才建议继续后续动作。

## 3. dry-run 部署

```bash
node scripts/deploy-n8n-workflow.mjs n8n/workflows/codex-planner-reviewer.workflow.json
```

默认只会：

- 先校验
- 打印 workflow 名称
- 打印 endpoint
- 明确说明没有发送 API 请求

不会真的创建 workflow。

## 4. 手动导入 n8n

推荐第一阶段使用手动导入：

1. 打开 n8n
2. 进入 workflows
3. 选择 Import from File
4. 导入 `n8n/workflows/codex-planner-reviewer.workflow.json`
5. 导入后先保持 inactive
6. 手动检查：
   - Webhook path
   - credential 绑定
   - 所有 placeholder 是否仍然是环境变量引用
   - `Human Approval Gate` 是否仍然保留

## 5. 测试 webhook

先生成测试 payload 和 curl：

```bash
node scripts/smoke-test-n8n-workflow.mjs
```

如果你已经有测试 webhook URL：

```bash
N8N_TEST_WEBHOOK_URL="https://your-test-url" node scripts/smoke-test-n8n-workflow.mjs
```

脚本会：

- 打印模拟 payload
- 输出可复制的 `curl`
- 只有在设置了 `N8N_TEST_WEBHOOK_URL` 时才发请求

## 6. 查看执行结果

第一版 workflow 会返回结构化 JSON，重点看：

- `status`
- `riskLevel`
- `requireHumanApproval`
- `codexTaskPrompt`
- `review`
- `nextAction`
- `warnings`

如果返回：

- `blocked`
- `needs_human_approval`

说明还没有进入任何后续执行链路。

## 7. 如何回滚

### workflow JSON 回滚

1. 在 Git 中找到上一个稳定版本
2. 恢复旧 JSON
3. 重新导入 n8n
4. 保持 inactive，先复查再决定是否激活

### Agent 结果回滚

1. 查看 Codex 产生的 diff
2. 人工决定是否撤销或修复
3. 如果已经形成 Git commit，再使用正常 Git 回滚流程处理

当前目录尚未初始化 Git；要真正获得回滚能力，需要先把本项目纳入版本控制。

## 8. 常见问题排查

### 校验脚本提示 JSON 无法解析

- 检查逗号、引号、括号是否配平
- 优先不要手工改大段 workflow JSON

### 提示存在 secret

- 检查是否误写了真实 token
- 检查 HTTP Header、credential 相关字段
- 改成环境变量引用或 n8n credential

### 部署脚本没有真正执行

- 这是默认行为
- 只有设置 `N8N_DEPLOY_MODE=apply` 才会调用 API

### apply 模式失败

- 确认 `N8N_BASE_URL`
- 确认 `N8N_API_KEY`
- 确认 `N8N_WORKFLOW_CREATE_ENDPOINT`
- 不同 n8n 版本 endpoint 可能不同，先按你的部署版本核对

### webhook 没响应

- 确认是否使用测试 webhook 还是 production webhook
- 确认 workflow 是否已在 n8n 中正确导入
- 确认 workflow 是否处于你预期的 inactive / active 状态

