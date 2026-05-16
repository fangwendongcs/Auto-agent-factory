# Goal-Driven Agent Workflow with n8n

一个基于 **n8n** 的可复用 Agent 工作流框架。  
它的目标不是让 Agent 无限制自动执行，而是让系统围绕一个明确的 `goal` 和一组可验证的 `criteria` 持续推进：

1. 接收目标和成功标准
2. 创建可追踪的运行记录
3. 调用执行 Agent 完成一轮任务
4. 逐项检查是否满足 criteria
5. 未达标时生成下一轮指令并继续
6. 达标、超时或达到最大迭代次数后生成最终报告并停止

## 当前阶段

当前仓库已经完成 **Phase 1–5 的 MVP 基础版本**：

已经完成：

- 仓库根目录正式定位为 `Goal-Driven Agent Workflow with n8n`
- 第一版产品说明、验收标准和工作流设计初稿
- `goal / task / result` schema
- master / subagent / criteria checker prompt 模板
- sample goal 与 agent result 示例
- 4 个正式 workflow JSON 模板
- 本地 mock 校验工具与 `npm test`
- 运行手册、测试用例和最终报告样例
- 旧版 `Codex Planner Reviewer Workflow` 原型仍保留在 `n8n/` 中，作为可复用的过渡资产

后续可继续扩展：

- 真实 provider / LLM 接入
- 真正的跨 workflow 自动调用
- 持久化执行日志
- 更完整的观测与评估

## 为什么做这个项目

很多 Agent 自动化项目的问题，不是“模型不够聪明”，而是：

- 目标不清楚
- 成功标准不明确
- 失败后没有重试策略
- 达标后不会及时停止
- 没有日志、回滚和人工确认

这个项目把这些约束前置，优先解决：

- 可复用
- 可测试
- 可追踪
- 可停止
- 可人工接管

## 目标项目结构

```text
.
├── README.md
├── docs/
│   ├── PRODUCT_SPEC.md
│   ├── MVP_ACCEPTANCE_CRITERIA.md
│   ├── WORKFLOW_DESIGN.md
│   ├── TEST_CASES.md                 # Phase 5
│   └── RUNBOOK.md                    # Phase 5
├── workflows/
│   ├── goal_driven_master.workflow.json      # Phase 3
│   ├── agent_task_executor.workflow.json     # Phase 3
│   ├── criteria_checker.workflow.json        # Phase 3
│   └── error_handler.workflow.json           # Phase 3
├── examples/
│   ├── sample_goal_request.json              # Phase 2
│   ├── sample_agent_result_success.json      # Phase 2
│   ├── sample_agent_result_failed.json       # Phase 2
│   └── sample_final_report.md                # Phase 5
├── src/
│   ├── schema/                               # Phase 2
│   ├── prompts/                              # Phase 2
│   └── utils/                                # Phase 4
├── tests/                                    # Phase 4
├── n8n/                                      # 旧原型与过渡资产
├── scripts/                                  # 当前已有本地工具
├── .env.example
└── .gitignore
```

## 核心设计原则

1. **Goal first**：先有目标，再有执行
2. **Criteria driven**：每轮结果都必须按 criteria 逐项判断
3. **Bounded execution**：默认限制最大迭代次数和超时，避免无限消耗
4. **Human in the loop**：高风险任务必须保留人工审核入口
5. **Mock first**：没有真实 API Key 时，也要能完成本地测试
6. **Workflow as code**：workflow JSON 必须进入 Git，便于审查和回滚
7. **Secrets stay out**：真实密钥不能进入仓库、workflow JSON 或日志

## MVP 路线图

### Phase 1：项目骨架与文档

- 定义产品目标
- 定义 MVP 验收标准
- 定义工作流初始设计
- 建立后续目录骨架

### Phase 2：数据结构与 Prompt 模板

- `goal / task / result` schema
- master / subagent / criteria checker prompt
- sample payload 示例

### Phase 3：4 个正式 n8n workflow

- `goal_driven_master`
- `agent_task_executor`
- `criteria_checker`
- `error_handler`

当前 Phase 3 导出的是 **mock-first 可导入模板**：

- 默认保持 inactive
- 不硬编码真实 workflow ID
- 导入后需要在 n8n UI 中把 Master 的调度占位节点替换或接成真正的 `Execute Sub-workflow` 调用
- 真实 LLM / Codex 调用仍保留在后续阶段接入

### Phase 4：本地 mock 测试

- payload 校验
- criteria scoring
- workflow contract tests
- `npm test`

### Phase 5：运行手册与最终验收

- runbook
- test cases
- sample final report
- README 复现说明

## 快速开始

### 1. 安装并运行本地 mock test

```bash
npm install
npm test
```

### 2. 校验正式 workflow JSON

```bash
npm run workflow:validate:all
```

### 3. dry-run 检查部署脚本

```bash
npm run workflow:dry-run
```

默认不会真实部署。

### 4. 生成正式流程 smoke-test 请求

```bash
npm run smoke:goal-driven
```

它会读取 `examples/sample_goal_request.json`，打印一条可直接复制的 `curl`。  
只有在你设置 `N8N_TEST_WEBHOOK_URL` 时，它才会真的发请求。

### 5. 检查导入前 readiness

```bash
npm run import:check
```

它会告诉你：

- 4 个 workflow 的名字是否正确
- 关键节点是否还在
- 哪些节点仍然需要在 UI 中手工接线
- 建议导入顺序

### 6. 可选：检查旧原型资产

```bash
node scripts/validate-n8n-workflow.mjs n8n/workflows/codex-planner-reviewer.workflow.json
node scripts/deploy-n8n-workflow.mjs n8n/workflows/codex-planner-reviewer.workflow.json
```

## 环境变量

复制示例文件：

```bash
cp .env.example .env
```

真实值只写在 `.env` 中，不要提交到 Git。

自动 Agent 可能消耗较多时间和 token，因此默认保留：

- `MAX_ITERATIONS_DEFAULT=5`
- `TIMEOUT_MINUTES_DEFAULT=30`
- `MANUAL_APPROVAL_REQUIRED=true`

## 与旧原型的关系

当前 `n8n/` 目录中的 `Codex Planner Reviewer Workflow` 是本项目的前导原型，它已经验证了：

- workflow JSON 入 Git
- 安全校验
- dry-run 部署
- 人工审批闸门
- 结构化返回结果

正式 MVP 会吸收这些经验，但会把产品中心从“Codex 专用流程”升级为“通用 Goal-Driven Agent 框架”。

## Phase 3 workflow 导入说明

当前正式模板位于：

```text
workflows/
├── goal_driven_master.workflow.json
├── agent_task_executor.workflow.json
├── criteria_checker.workflow.json
└── error_handler.workflow.json
```

导入后请人工检查：

1. 4 个 workflow 都保持 inactive
2. `Goal-Driven Master Workflow` 中的调度说明节点是否仍然指向：
   - `agent_task_executor.workflow.json`
   - `criteria_checker.workflow.json`
3. 在 n8n UI 中把 Master 的调度占位节点替换或接成真正的 `Execute Sub-workflow` 调用：
   - Master → Agent Task Executor
   - Master → Criteria Checker
4. 将 `Goal-Driven Error Handler Workflow` 配置为主 workflow 的 error workflow
5. 在真正激活前，先使用 sample payload 手动执行

更短的联调前清单见：

- `docs/MANUAL_IMPORT_CHECKLIST.md`
- `docs/IMPORT_ORDER.md`

## 如何手动测试

1. 打开 `Goal-Driven Master Workflow`
2. 使用：

   ```text
   examples/sample_goal_request.json
   ```

3. 手动触发执行
4. 检查：
   - 是否生成 `run_id`
   - 是否生成 `task_id`
   - 是否返回 `criteria_result`
   - 未达标时是否返回下一轮指令

成功与失败结果样例：

- `examples/sample_agent_result_success.json`
- `examples/sample_agent_result_failed.json`

最终报告样例：

- `examples/sample_final_report.md`

更适合手动联调的 payload：

- `examples/manual-test-payloads/01-valid-goal.json`
- `examples/manual-test-payloads/02-missing-goal.json`
- `examples/manual-test-payloads/03-missing-criteria.json`
- `examples/manual-test-payloads/04-high-risk-needs-approval.json`

## 如何查看 execution 与处理失败

如果 workflow 执行失败：

1. 先查看 n8n execution history
2. 重点看：
   - 最后执行节点
   - 节点输入 / 输出
   - 错误信息
3. 确认 `Goal-Driven Error Handler Workflow` 已被绑定为 error workflow
4. 修复后先手动重跑，再考虑恢复自动运行

详细步骤见：

- `docs/RUNBOOK.md`
- `docs/TEST_CASES.md`
- `docs/MANUAL_IMPORT_CHECKLIST.md`

## MVP 验收清单

完成以下检查后，可以认为 MVP 版本成立：

- [x] 项目结构完整
- [x] 4 个 workflow JSON 已存在
- [x] schema、prompt、examples 已存在
- [x] `npm test` 可通过
- [x] workflow JSON 可校验
- [x] `error_handler.workflow.json` 已存在
- [x] 支持 mock mode
- [x] README / Runbook / Test Cases / Final Report 已存在
- [ ] 已在你的 n8n 实例中完成 UI 导入与手动接线
- [ ] 已在你的 n8n 实例中手动跑通 sample payload

## 下一步

MVP 基础版已经成立。  
下一步不再是“继续补骨架”，而是进入你自己的 n8n 实例做一次**真实手动联调**：

1. 导入 4 个正式 workflow
2. 手动接好子 workflow 与 error workflow
3. 用 sample payload 跑通一轮
4. 再决定是否进入真实 provider 接入
