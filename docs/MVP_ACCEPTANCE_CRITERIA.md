# MVP_ACCEPTANCE_CRITERIA

## 1. 验收总原则

MVP 不是“看起来像一个 Agent 系统”，而是要满足：

- 可复现
- 可测试
- 可导入
- 可停止
- 可排错
- 可继续扩展

## 2. 项目结构验收

| 编号 | 验收标准 | 通过条件 |
| --- | --- | --- |
| A1 | 项目目录完整 | 必须包含 `docs/`、`workflows/`、`examples/`、`src/`、`tests/` |
| A2 | README 完整 | 说明项目目标、结构、运行方式、n8n 导入方式和 mock 测试方式 |
| A3 | 工作流文件完整 | 至少有 4 个 workflow JSON |
| A4 | 示例数据完整 | 至少包含 goal 请求、成功结果、失败结果、最终报告 |
| A5 | 环境变量安全 | 提供 `.env.example`，且不包含真实密钥 |
| A6 | Git 忽略合理 | `.gitignore` 忽略 `.env`、日志、缓存和构建产物 |

## 3. n8n 工作流验收

| 编号 | 验收标准 | 通过条件 |
| --- | --- | --- |
| B1 | Master Workflow 可导入 | `goal_driven_master.workflow.json` 是合法 JSON 且节点命名清晰 |
| B2 | Executor Workflow 可导入 | `agent_task_executor.workflow.json` 是合法 JSON 且节点命名清晰 |
| B3 | Checker Workflow 可导入 | `criteria_checker.workflow.json` 是合法 JSON 且节点命名清晰 |
| B4 | Error Handler 可导入 | `error_handler.workflow.json` 是合法 JSON 且以错误处理为职责中心 |
| B5 | 工作流关系清晰 | 文档说明四个 workflow 的调用关系 |
| B6 | 支持手动测试 | README 说明如何使用 sample payload 测试 |
| B7 | 支持自动运行 | README 说明激活 trigger / webhook 后的运行方式 |
| B8 | 支持执行排查 | RUNBOOK 说明如何查看 execution、重跑和定位错误 |

## 4. Goal-Driven 逻辑验收

| 编号 | 验收标准 | 通过条件 |
| --- | --- | --- |
| C1 | 输入必须包含 goal | 缺少时返回明确错误 |
| C2 | 输入必须包含 criteria | 缺少时返回明确错误 |
| C3 | 每次运行生成 run_id | 可追踪整轮执行 |
| C4 | 每个子任务生成 task_id | 可追踪单轮任务 |
| C5 | Checker 逐项判断 | 每条 criterion 都有 pass / fail 和 evidence |
| C6 | 未达标时生成下一轮指令 | 必须指出下一步该修什么 |
| C7 | 达标时停止循环 | 不能继续消耗 token |
| C8 | 达到 max_iterations 时停止 | 默认值不超过 5 |
| C9 | 每轮执行有日志 | 至少记录输入摘要、输出摘要、判断结果 |
| C10 | 最终生成报告 | 成功或失败都要有最终报告 |

## 5. Agent 调用验收

| 编号 | 验收标准 | 通过条件 |
| --- | --- | --- |
| D1 | Prompt 独立存放 | master / subagent / checker prompt 不硬编码在 workflow 中 |
| D2 | 子 Agent 输出结构化 JSON | 不能只返回自然语言 |
| D3 | 支持 mock 模式 | 无真实 API Key 时也能跑测试 |
| D4 | 支持真实模式扩展 | 有环境变量时可切换真实调用 |
| D5 | 失败结果可被识别 | Agent 失败不能让系统无解释崩溃 |
| D6 | 保留人工审核入口 | 高风险任务可暂停等待人工确认 |

## 6. 安全与成本控制验收

| 编号 | 验收标准 | 通过条件 |
| --- | --- | --- |
| E1 | API Key 不进 workflow JSON | 只能引用环境变量或 credentials |
| E2 | 不保存敏感输入全文 | 日志保存摘要，不裸存密钥和隐私信息 |
| E3 | 有最大迭代次数 | 默认 `max_iterations <= 5` |
| E4 | 有超时时间 | 默认 `timeout_minutes <= 30` |
| E5 | 有人工停止机制 | 用户可以中断流程 |
| E6 | 有成本提示 | README 说明自动 Agent 可能消耗时间和 token |

## 7. 测试验收

| 编号 | 测试类型 | 通过条件 |
| --- | --- | --- |
| F1 | 正常输入测试 | `sample_goal_request.json` 能跑通 |
| F2 | 缺少 goal 测试 | 返回明确错误 |
| F3 | 缺少 criteria 测试 | 返回明确错误 |
| F4 | Agent 成功测试 | Checker 返回 `criteria_met: true` |
| F5 | Agent 未完成测试 | Checker 返回下一轮修复指令 |
| F6 | 最大迭代测试 | 流程停止并生成失败报告 |
| F7 | Error workflow 测试 | 主流程失败时进入错误处理 |
| F8 | Mock 模式测试 | 无 API Key 时仍能通过 |
| F9 | JSON Schema 测试 | goal / task / result 三类 payload 可校验 |
| F10 | README 可复现测试 | 按 README 可以复现核心流程 |

## 8. 当前阶段完成定义

Phase 1 完成时，以下内容必须已经存在：

- 根目录 `README.md`
- `docs/PRODUCT_SPEC.md`
- `docs/MVP_ACCEPTANCE_CRITERIA.md`
- `docs/WORKFLOW_DESIGN.md`
- 后续阶段目录骨架
- `.env.example`
- `.gitignore`

Phase 1 **不要求**：

- 4 个正式 workflow 已完成
- `npm test` 已可运行
- 真实 API 已接入

