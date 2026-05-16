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

当前仓库处于 **Phase 1：正式项目定义与骨架搭建**。

已经完成：

- 仓库根目录正式定位为 `Goal-Driven Agent Workflow with n8n`
- 第一版产品说明、验收标准和工作流设计初稿
- 后续阶段所需目录骨架
- 旧版 `Codex Planner Reviewer Workflow` 原型仍保留在 `n8n/` 中，作为可复用的过渡资产

尚未完成：

- `goal / task / result` schema
- prompt 模板
- 4 个正式 Goal-Driven workflow JSON
- mock 测试工具与 `npm test`
- 最终 runbook、测试用例和最终报告样例

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

当前阶段还没有正式的 `npm test`，也还没有可直接导入的正式 Goal-Driven workflow。  
如果你想先检查当前仓库已有原型资产，可以运行：

```bash
node scripts/validate-n8n-workflow.mjs n8n/workflows/codex-planner-reviewer.workflow.json
node scripts/deploy-n8n-workflow.mjs n8n/workflows/codex-planner-reviewer.workflow.json
```

第二条命令默认是 `dry-run`，不会真实部署。

## 环境变量

复制示例文件：

```bash
cp .env.example .env
```

真实值只写在 `.env` 中，不要提交到 Git。

## 与旧原型的关系

当前 `n8n/` 目录中的 `Codex Planner Reviewer Workflow` 是本项目的前导原型，它已经验证了：

- workflow JSON 入 Git
- 安全校验
- dry-run 部署
- 人工审批闸门
- 结构化返回结果

正式 MVP 会吸收这些经验，但会把产品中心从“Codex 专用流程”升级为“通用 Goal-Driven Agent 框架”。

## 下一步

下一阶段是 **Phase 2：数据结构与 Prompt 模板**。  
在开始写正式 workflow JSON 之前，先把 payload contract 和 Agent 输出格式固定下来。

