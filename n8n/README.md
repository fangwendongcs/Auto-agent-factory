# n8n 工作流代码化目录

这个目录用于把 n8n workflow 当成代码来管理，而不是把它留在不可追踪的 UI 黑盒里。

当前第一版包含：

- `workflows/codex-planner-reviewer.workflow.json`
- 规划、Codex 任务构建、人工审批、审查结果解析的基础节点骨架
- 默认 `inactive` 的工作流定义
- 与 `scripts/`、`docs/` 配套的校验、部署和运维说明

## 如何导入 workflow JSON

1. 先运行校验：

   ```bash
   node scripts/validate-n8n-workflow.mjs n8n/workflows/codex-planner-reviewer.workflow.json
   ```

2. 在 n8n UI 中手动导入：
   - 打开 workflows
   - 选择 Import from File
   - 选择 `n8n/workflows/codex-planner-reviewer.workflow.json`
   - 导入后先保持 inactive
   - 人工复查节点、凭据和 webhook path 后，再决定是否激活

## 如何 dry-run 部署

```bash
node scripts/deploy-n8n-workflow.mjs n8n/workflows/codex-planner-reviewer.workflow.json
```

默认读取：

- `N8N_BASE_URL`
- `N8N_API_KEY`
- `N8N_WORKFLOW_CREATE_ENDPOINT`
- `N8N_DEPLOY_MODE`

默认模式是 `dry-run`，不会调用线上 API。只有显式设置：

```bash
N8N_DEPLOY_MODE=apply
```

时，脚本才会尝试调用 n8n API。

> 注意：不同 n8n 版本或部署方式的 workflow 创建 endpoint 可能不同。  
> 当前默认值是 `/api/v1/workflows`，正式使用前请先根据你自己的 n8n 版本确认，并在必要时覆盖 `N8N_WORKFLOW_CREATE_ENDPOINT`。

## 如何避免密钥泄露

- 不要把真实 token、API key、password 写进 workflow JSON
- 所有密钥只放在本地环境变量或 n8n credential 中
- 仓库只提交 `.env.example`，不要提交 `.env`
- 导出 workflow JSON 后，先跑校验脚本再提交
- HTTP Header 中只允许出现明显环境变量占位符，例如：
  - `{{ $env.OPENAI_API_KEY }}`
  - `{{ $env.GITHUB_TOKEN }}`

## 如何回滚

推荐做法：

1. workflow JSON 永远纳入 Git
2. 每次修改前后都保留 commit
3. 若导入后发现问题：
   - 在 Git 中回到上一个版本的 JSON
   - 重新导入旧版本
   - 或在 n8n UI 中停用当前 workflow 后再恢复旧版

当前目录刚建立时还没有 Git 历史；初始化仓库后，才真正具备版本回滚能力。

## 当前第一版的限制

- Planner Agent 目前只是 placeholder，还没有真正调用模型
- Reviewer Agent 目前只是 placeholder，只做结构化审查骨架
- Codex 调用采用 adapter 设计，不假设存在直接 Codex API
- 默认需要人工确认，尤其是中高风险任务
- 当前优先保证“可导入、可校验、可扩展”，不是一次性完成全自动闭环

