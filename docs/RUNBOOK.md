# RUNBOOK

## 1. 目的

这份 Runbook 用于指导你在本地和 n8n 中复现、检查、排错和回滚 `Goal-Driven Agent Workflow with n8n`。

当前 MVP 采用 **mock-first** 设计：

- 不需要真实 LLM API
- 不需要真实 Codex API
- 先验证 contract、workflow JSON 和人工操作路径

## 2. 前置条件

### 本地

- Node.js 20+（当前项目已在 Node 24 环境验证）
- npm
- Git

### n8n

- 一个可访问的 n8n 实例
- 允许手动导入 workflow JSON
- 导入后先不要激活生产 workflow

## 3. 配置环境变量

复制示例文件：

```bash
cp .env.example .env
```

当前 mock 阶段，最重要的是保留：

```dotenv
AGENT_MODE=mock
MAX_ITERATIONS_DEFAULT=5
TIMEOUT_MINUTES_DEFAULT=30
MANUAL_APPROVAL_REQUIRED=true
```

如果你暂时不做真实部署，可以保持：

```dotenv
N8N_DEPLOY_MODE=dry-run
```

注意：

- `.env` 只保存在本地
- 不要把真实 token、API key、password 写进 workflow JSON
- 不要在执行日志中输出真实密钥

## 4. 本地验证顺序

### 4.1 运行全部 mock test

```bash
npm test
```

预期：

- 所有测试通过
- 不需要真实 API Key

### 4.2 校验 4 个正式 workflow

```bash
npm run workflow:validate:all
```

预期：

- `PASS: YES`
- `ERRORS: none`

### 4.3 执行 dry-run

```bash
npm run workflow:dry-run
```

预期：

- 打印 workflow 名称
- 显示 `Deploy mode: dry-run`
- 明确说明没有发送 API 请求

### 4.4 生成正式 smoke-test 请求

```bash
npm run smoke:goal-driven
```

预期：

- 读取 `examples/sample_goal_request.json`
- 打印可复制的 `curl`
- 未设置 `N8N_TEST_WEBHOOK_URL` 时不发真实请求

### 4.5 检查导入前 readiness

```bash
npm run import:check
```

预期：

- 打印 4 个正式 workflow 的名称
- 标记全部为 inactive
- 列出 Master 中需要复核的子 workflow 绑定
- 打印建议导入顺序

## 5. 如何导入 n8n

按以下顺序手动导入；左侧是 UI 中看到的 workflow 名称，右侧是仓库里的标准文件路径：

1. `[GoalDriven] 02 Agent Task Executor` → `workflows/agent_task_executor.workflow.json`
2. `[GoalDriven] 03 Criteria Checker` → `workflows/criteria_checker.workflow.json`
3. `[GoalDriven] 04 Error Handler` → `workflows/error_handler.workflow.json`
4. `[GoalDriven] 01 Master` → `workflows/goal_driven_master.workflow.json`

导入后检查：

- 4 个 workflow 都保持 inactive
- 节点名称是否完整
- Error Handler 是否以 `Error Trigger` 开头
- Executor / Checker 是否以 `When Executed by Another Workflow` 开头

如果你想边操作边核对，直接打开：

```text
docs/MANUAL_IMPORT_CHECKLIST.md
docs/IMPORT_ORDER.md
```

## 6. 导入后的绑定复核

当前仓库里的正式 JSON 已保留你在 n8n UI 中联调通过的跨 workflow 绑定。  
这对**同一实例重新导入**很方便；但如果你把项目迁移到**另一台 n8n 实例**，因为 workflow ID 会变化，需要在 UI 中重新选择绑定：

1. 在 Master 中重新确认 `Execute Sub-workflow` 指向 `[GoalDriven] 02 Agent Task Executor`
2. 在 Master 中重新确认 `Execute Sub-workflow` 指向 `[GoalDriven] 03 Criteria Checker`
3. 在 Master workflow 设置中，把 error workflow 重新选择为 `[GoalDriven] 04 Error Handler`

完成后，先不要急着激活，先做手动执行。

## 7. 如何手动测试

### 7.1 读取 sample payload

使用：

```text
examples/sample_goal_request.json
```

如果你想覆盖更多手动场景，使用：

```text
examples/manual-test-payloads/
```

### 7.2 手动执行 Master Workflow

在 n8n UI 中：

1. 打开 `[GoalDriven] 01 Master`
2. 选择手动执行
3. 用 sample payload 触发 Webhook / 测试入口
4. 查看输出中的：
   - `run_id`
   - `task_id`
   - `status`
   - `criteria_result`
   - `next_action`

### 7.3 预期结果

当前 mock 模板下，Master Workflow 应至少能体现：

- payload 被校验
- `run_id / task_id` 被生成
- criteria 被逐项检查
- 未全部通过时，生成下一轮指令
- 若达到限制，给出停止原因

## 8. 如何查看 execution

在 n8n 中排查问题时，优先查看 execution 记录：

1. 打开对应 workflow
2. 查看 execution history
3. 先筛选失败执行
4. 查看：
   - 最后执行节点
   - 输入摘要
   - 节点输出
   - 错误信息
5. 修复后先手动重跑，再决定是否恢复自动运行

## 9. 常见失败与排查

### 9.1 缺少 goal / criteria

现象：

- `status = invalid_request`
- `validation_errors` 中出现缺字段说明

处理：

- 对照 `src/schema/goal.schema.json`
- 使用 `examples/sample_goal_request.json` 作为基准

### 9.2 子 workflow 没有真正被调用

现象：

- 只看到 mock 占位结果
- 没有真实子 workflow execution

处理：

- 检查 Master 中是否已经手工接好 `Execute Sub-workflow`
- 检查目标 workflow 是否选对

### 9.3 Error Handler 没触发

现象：

- 主 workflow 失败，但错误流程没有执行

处理：

- 检查 Master workflow 设置中是否已配置 error workflow
- 确认错误流程以 `Error Trigger` 开头

### 9.4 Workflow 导入失败

处理顺序：

1. 先运行本地 validate 脚本
2. 确认 JSON 没被手工改坏
3. 检查 n8n 版本差异
4. 必要时先在 UI 中新建一个空 workflow，对照节点类型手工修复

## 10. 如何回滚

### 本地代码回滚

1. 先查看：

   ```bash
   git status
   git log --oneline
   ```

2. 找到上一个稳定版本
3. 优先使用新的修复提交或 revert，而不是破坏历史

### n8n workflow 回滚

1. 停用有问题的 workflow
2. 从 Git 中取回旧版 JSON
3. 重新导入或恢复旧配置
4. 先手动执行验证，再决定是否恢复自动运行

## 11. 什么时候可以考虑激活

只有同时满足以下条件时，才建议激活生产触发器：

- `npm test` 全部通过
- workflow JSON 校验通过
- 已完成 n8n UI 手动接线
- 已手动跑通 sample payload
- 已确认 error workflow 生效
- 已人工检查 workflow diff 和 credential 配置

## 12. 成本与安全提醒

- Agent 自动化可能消耗大量 token 和时间
- `max_iterations` 与 `timeout_minutes` 不是装饰项，而是停止边界
- 真实 provider 接入前，先保留 mock 流程
- 生产环境中的高风险任务必须保留人工审核入口
