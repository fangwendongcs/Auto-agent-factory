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

### 7.4 Executor 模式手动测试

当前 `[GoalDriven] 02 Agent Task Executor` 已支持三种安全模式：

1. `mock`
2. `dry-run`
3. `real-readonly`

对应的手动 payload：

```text
examples/manual-test-payloads/05-dry-run-mode.json
examples/manual-test-payloads/06-real-readonly-mode.json
```

其中：

- `dry-run` 只生成计划，不执行真实动作
- `real-readonly` 当前仍是 stub，只生成只读分析结果，不调用真实 provider，也不产生真实副作用
- 两种模式都必须继续返回标准 `agent_result`，供 Criteria Checker 无感验收

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

## 9. Error Handler 验证结果

### 9.1 验证方式

当前 MVP 已完成一次真实的 Error Handler 自动触发验证：

1. 在 `[GoalDriven] 01 Master` 中临时增加测试分支：

   ```text
   Payload Validator
   → [TEST] Error Handler Probe
      ├─ true → [TEST] Trigger Error Handler
      └─ false → Approval or Invalid Router
   ```

2. `[TEST] Error Handler Probe` 只识别：

   ```text
   context.force_error_handler_test = true
   ```

3. `[TEST] Trigger Error Handler` 使用 `Stop And Error`，错误信息为：

   ```text
   Intentional error-handler verification test
   ```

4. 使用 **Production Webhook** 触发带测试标记的 payload，而不是使用手动测试入口。

重要限制：

- `Error Trigger` 不能通过手动 `Execute Workflow` 测试触发
- 必须由自动 workflow execution 失败后触发
- 因此验证 Error Handler 时必须使用 Production Webhook 自动执行路径

### 9.2 成功标准与本次结果

本次验证已通过，证据如下：

- `[GoalDriven] 01 Master` 出现 `failed execution`
- 失败节点为 `[TEST] Trigger Error Handler`
- 错误信息包含 `Intentional error-handler verification test`
- `[GoalDriven] 04 Error Handler` 出现新的 `succeeded execution`
- `Error Trigger → Error Normalizer → Recovery Advisor` 全部执行成功

### 9.3 测试后恢复

验证完成后，已执行以下恢复步骤：

1. 删除 `[TEST] Error Handler Probe`
2. 删除 `[TEST] Trigger Error Handler`
3. 恢复：

   ```text
   Payload Validator → Approval or Invalid Router
   ```

4. 重新发布 Master
5. 用 Production Webhook 正常 payload 回归：
   - 返回 `run_id`
   - 返回 `task_id`
   - 返回 `criteria_result`
   - 返回 `next_action`
6. 用 high-risk 且 `human_approved=false` 的 payload 回归：
   - 返回 `needs_human_approval`
7. 本地重新运行：

   ```bash
   npm test
   npm run workflow:validate:all
   npm run workflow:dry-run
   npm run import:check
   ```

当前结果：

- `npm test` 通过，`16/16`
- `workflow:validate:all` 通过，`0 warning / 0 error`
- `workflow:dry-run` 通过
- `import:check` 通过


## 10. V0.3a real-readonly UI 验证

当前仓库中的 `[GoalDriven] 02 Agent Task Executor` 已包含：

- `Mode Router`
- `Real-readonly Provider Adapter`
- `Result Normalizer`
- `Execution Logger`

下一步需要在 n8n UI 中确认运行态 workflow 已同步到这个结构，并通过 Production Webhook 验证 real-readonly payload。

完整操作清单见：

```text
docs/V0_3A_REAL_READONLY_UI_VERIFICATION.md
```

在验证完成前，不要把 real-readonly 写成真实 provider 能力。当前它仍然是 stub，只用于验证 contract、路由和安全边界。

## 11. Mode Router verification

`[GoalDriven] 02 Agent Task Executor` 的 Mode Router 使用 n8n Switch V3。

Switch V3 的条件必须使用 filter-style conditions，不要使用旧的 `conditions.string` 格式。旧格式可能导致规则判断失效，进而让 `mock` 或 `dry-run` 请求错误进入 `real-readonly` 分支。

当前期望路由：

```text
real-readonly → Real-readonly Provider Adapter
dry-run       → Dry-run Provider Adapter
mock/default  → Mock Agent Adapter
```

验证要求：

- `provider_mode = real-readonly` 或 `agent_mode = real-readonly` 时，必须走 Real-readonly Provider Adapter
- `provider_mode = dry-run` 或 `agent_mode = dry-run` 时，必须走 Dry-run Provider Adapter
- 缺少 `provider_mode / agent_mode` 时，必须 fallback 到 Mock Agent Adapter
- 三条路径都应通过 Production Webhook 单独回归

如果 mock 或 dry-run payload 返回：

```text
agent_result.provider.mode = real-readonly
```

优先检查：

1. Mode Router 是否仍在使用旧 `conditions.string` 格式
2. Mode Router 输出连接顺序是否正确
3. Master 传给 Executor 的 `provider_mode / agent_mode` 是否被错误默认成 `real-readonly`
4. Master 是否绑定到正确的 `[GoalDriven] 02 Agent Task Executor`
5. n8n UI runtime 是否已经同步到仓库中的 `workflows/agent_task_executor.workflow.json`

相关验证记录见：

```text
docs/VALIDATION_LOG.md
```

## 12. 常见失败与排查

### 12.1 缺少 goal / criteria

现象：

- `status = invalid_request`
- `validation_errors` 中出现缺字段说明

处理：

- 对照 `src/schema/goal.schema.json`
- 使用 `examples/sample_goal_request.json` 作为基准

### 12.2 子 workflow 没有真正被调用

现象：

- 只看到 mock 占位结果
- 没有真实子 workflow execution

处理：

- 检查 Master 中是否已经手工接好 `Execute Sub-workflow`
- 检查目标 workflow 是否选对

### 12.3 Error Handler 没触发

现象：

- 主 workflow 失败，但错误流程没有执行

处理：

- 检查 Master workflow 设置中是否已配置 error workflow
- 确认错误流程以 `Error Trigger` 开头

### 12.4 Workflow 导入失败

处理顺序：

1. 先运行本地 validate 脚本
2. 确认 JSON 没被手工改坏
3. 检查 n8n 版本差异
4. 必要时先在 UI 中新建一个空 workflow，对照节点类型手工修复

## 13. 如何回滚

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

## 14. 什么时候可以考虑激活

只有同时满足以下条件时，才建议激活生产触发器：

- `npm test` 全部通过
- workflow JSON 校验通过
- 已完成 n8n UI 手动接线
- 已手动跑通 sample payload
- 已确认 Error Handler 可被自动失败触发
- 已确认 Production Webhook 正常 payload 可运行
- 已确认 high-risk 人工审核拦截仍生效
- 已人工检查 workflow diff 和 credential 配置

## 15. 进入真实 provider 前

在把 mock-first MVP 继续推进到真实 provider / LLM / HTTP adapter 之前，必须先完成：

```text
docs/PRODUCTION_READINESS.md
```

这份清单负责确认：

- 发布状态是否可控
- credential 与 secret 是否安全
- webhook 是否适合进入公网
- execution / logging 是否足够排错
- rollback / restore 是否已经有明确路径
- real provider 接入是否仍然保留 mock、dry-run 和人工审批边界

如果 `PRODUCTION_READINESS` 仍有关键项未完成，不建议直接接入真实 provider。

下一阶段建议是：

```text
V0.4 real provider adapter design
```

边界仍然是 read-only first：

- no file write
- no shell execution
- no Git modification
- no production autonomous write actions
- keep human approval for risky operations

## 16. 成本与安全提醒

- Agent 自动化可能消耗大量 token 和时间
- `max_iterations` 与 `timeout_minutes` 不是装饰项，而是停止边界
- 真实 provider 接入前，先保留 mock 流程
- 生产环境中的高风险任务必须保留人工审核入口
