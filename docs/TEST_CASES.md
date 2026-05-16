# TEST_CASES

## 1. 测试目标

验证 MVP 是否满足：

- 输入可校验
- criteria 可逐项评分
- workflow contract 不漂移
- mock 模式下无需真实 API 也能复现核心行为

## 2. 自动化测试矩阵

| 编号 | 场景 | 对应测试文件 | 预期 |
| --- | --- | --- | --- |
| T1 | 正常 goal payload | `tests/payload-validation.test.js` | 通过 |
| T2 | 缺少 `goal` | `tests/payload-validation.test.js` | 明确失败 |
| T3 | 缺少 `criteria` | `tests/payload-validation.test.js` | 明确失败 |
| T4 | `max_iterations > 5` | `tests/payload-validation.test.js` | 明确失败 |
| T5 | 成功 result schema | `tests/payload-validation.test.js` | 通过 |
| T6 | 失败 result schema | `tests/payload-validation.test.js` | 通过 |
| T7 | 成功 evidence | `tests/criteria-checker.test.js` | `criteria_met = true` |
| T8 | 未完成 evidence | `tests/criteria-checker.test.js` | 生成下一轮指令 |
| T9 | 缺失 evidence | `tests/criteria-checker.test.js` | `unknown`，不可伪造通过 |
| T10 | 达到最大迭代次数 | `tests/criteria-checker.test.js` | `max_iterations_reached` |
| T11 | 达到超时 | `tests/criteria-checker.test.js` | `timed_out` |
| T12 | 4 个 workflow 都是 inactive JSON | `tests/workflow-contract.test.js` | 通过 |
| T13 | workflow 连接目标存在 | `tests/workflow-contract.test.js` | 通过 |
| T14 | Master 关键节点存在 | `tests/workflow-contract.test.js` | 通过 |
| T15 | Executor / Checker 是子 workflow | `tests/workflow-contract.test.js` | 通过 |
| T16 | Error Handler 以 Error Trigger 开头 | `tests/workflow-contract.test.js` | 通过 |

## 3. 手动测试用例

### M1：正常输入

输入：

```text
examples/sample_goal_request.json
```

预期：

- 生成 `run_id`
- 生成 `task_id`
- 返回结构化状态

### M2：缺少 goal

输入：

```json
{
  "criteria": ["必须生成报告"]
}
```

预期：

- 返回 `invalid_request`
- 明确指出 `goal is required`

### M3：缺少 criteria

输入：

```json
{
  "goal": "生成报告"
}
```

预期：

- 返回 `invalid_request`
- 明确指出 criteria 缺失

### M4：高风险任务要求人工审核

输入：

```json
{
  "goal": "修改生产工作流",
  "criteria": ["必须保留回滚方案"],
  "risk_level": "high",
  "require_human_approval": true
}
```

预期：

- 返回 `needs_human_approval`
- 不直接派发执行

### M5：Agent 成功结果

输入：

```text
examples/sample_agent_result_success.json
```

预期：

- Checker 返回 `criteria_met = true`
- 不再生成下一轮指令

### M6：Agent 未完成结果

输入：

```text
examples/sample_agent_result_failed.json
```

预期：

- Checker 返回 `criteria_met = false`
- 返回下一轮修复指令

### M7：达到最大迭代

输入：

- `iteration = 5`
- `max_iterations = 5`

预期：

- 停止继续派发
- `stop_reason = max_iterations_reached`

### M8：Error workflow

操作：

- 在主 workflow 中人为制造失败
- 确认已经绑定 error workflow

预期：

- `Goal-Driven Error Handler Workflow` 被触发
- 返回错误摘要和恢复建议

### M9：高风险任务需要人工审核

输入：

```text
examples/manual-test-payloads/04-high-risk-needs-approval.json
```

预期：

- 返回 `needs_human_approval`
- 不继续派发执行

## 4. 回归测试建议

每次修改以下内容后，都应重新运行：

```bash
npm test
npm run workflow:validate:all
```

需要重点回归的情况：

- 改 schema
- 改 workflow 连接
- 改 criteria 评分规则
- 改 error workflow
- 改 README 中的复现步骤

## 5. 当前测试边界

当前测试已经覆盖：

- schema 合同
- mock criteria 评分
- workflow 文件结构

当前测试尚未覆盖：

- 真实 n8n UI 导入兼容性
- 真实 provider 调用
- 多轮真实执行时的持久化日志
- 跨环境 workflow ID 配置
