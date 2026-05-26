# MANUAL_IMPORT_CHECKLIST

## 使用目的

这份清单用于你第一次把 `Goal-Driven Agent Workflow with n8n` 导入到真实 n8n 实例前后的人工检查。  
它比 Runbook 更短，适合你边操作边打勾。

## A. 导入前检查

- [ ] 已运行 `npm test`
- [ ] 已运行 `npm run workflow:validate:all`
- [ ] 已运行 `npm run workflow:dry-run`
- [ ] 已运行 `npm run import:check`
- [ ] 当前仓库没有真实 `.env` 被提交
- [ ] 4 个正式 workflow 文件都存在：
  - [ ] `goal_driven_master.workflow.json`
  - [ ] `agent_task_executor.workflow.json`
  - [ ] `criteria_checker.workflow.json`
  - [ ] `error_handler.workflow.json`
- [ ] 已准备好：
  - [ ] `examples/sample_goal_request.json`
  - [ ] `examples/sample_agent_result_success.json`
  - [ ] `examples/sample_agent_result_failed.json`
  - [ ] `examples/manual-test-payloads/01-valid-goal.json`
  - [ ] `examples/manual-test-payloads/02-missing-goal.json`
  - [ ] `examples/manual-test-payloads/03-missing-criteria.json`
  - [ ] `examples/manual-test-payloads/04-high-risk-needs-approval.json`
  - [ ] `examples/manual-test-payloads/05-dry-run-mode.json`
  - [ ] `examples/manual-test-payloads/06-real-readonly-mode.json`

## B. 导入顺序

建议按这个顺序导入：

1. [ ] `[GoalDriven] 02 Agent Task Executor`
2. [ ] `[GoalDriven] 03 Criteria Checker`
3. [ ] `[GoalDriven] 04 Error Handler`
4. [ ] `[GoalDriven] 01 Master`

更短的一页版说明：

- [ ] 已打开 `docs/IMPORT_ORDER.md`

## C. 导入后基础检查

- [ ] 4 个 workflow 都保持 inactive
- [ ] Executor 以 `When Executed by Another Workflow` 开头
- [ ] Checker 以 `When Executed by Another Workflow` 开头
- [ ] Error Handler 以 `Error Trigger` 开头
- [ ] Master 仍然包含：
  - [ ] `Webhook Trigger`
  - [ ] `Payload Validator`
  - [ ] `Approval or Invalid Router`
  - [ ] `Task Initializer`
  - [ ] `Agent Dispatcher`
  - [ ] `Call '[GoalDriven] 02 Agent Task Executor'`
  - [ ] `Criteria Router`
  - [ ] `Call '[GoalDriven] 03 Criteria Checker'`
  - [ ] `Criteria Met Router`
  - [ ] `Final Reporter`

## D. 绑定复核

- [ ] 已确认当前导入场景：
  - [ ] 同一 n8n 实例重导入
  - [ ] 迁移到另一台 n8n 实例
- [ ] 如果是同一实例重导入，已确认 Master 中已有两个 `Execute Sub-workflow` 绑定仍然可用
- [ ] 如果是跨实例迁移，已在 Master 中重新选择：
  - [ ] `[GoalDriven] 02 Agent Task Executor`
  - [ ] `[GoalDriven] 03 Criteria Checker`
- [ ] 如果是跨实例迁移，已在 Master 设置中重新选择：
  - [ ] `[GoalDriven] 04 Error Handler` 为 error workflow

## E. 首次手动测试

- [ ] 使用 `examples/sample_goal_request.json`
- [ ] 手动执行 Master Workflow
- [ ] 检查是否出现：
  - [ ] `run_id`
  - [ ] `task_id`
  - [ ] `criteria_result`
  - [ ] `next_action`
- [ ] 如果未全部通过，是否返回下一轮指令
- [ ] 如果人为制造失败，是否进入 Error Handler
- [ ] 已额外测试：
  - [ ] 缺少 goal
  - [ ] 缺少 criteria
  - [ ] high risk 需要人工审核
- [ ] Error Handler 已通过自动失败触发验证
- [ ] 已确认验证 Error Handler 时使用的是 Production Webhook，而不是手动 `Execute Workflow`
- [ ] Production Webhook 正常 payload 已验证
- [ ] high risk 且 `human_approved=false` 的人工审核拦截已验证
- [ ] 已打开 `docs/V0_3A_REAL_READONLY_UI_VERIFICATION.md`
- [ ] `[GoalDriven] 02 Agent Task Executor` 已包含 `Real-readonly Provider Adapter`
- [ ] `[GoalDriven] 02 Agent Task Executor` 已包含 `Result Normalizer`
- [ ] real-readonly Production Webhook payload 已验证
- [ ] real-readonly execution 路径经过 `Mode Router → Real-readonly Provider Adapter → Result Normalizer → Execution Logger`

## F. 激活前最后确认

- [ ] 手动 execution 已通过
- [ ] execution history 中没有未解释错误
- [ ] workflow diff 已人工查看
- [ ] credential / env 配置已人工复核
- [ ] 已确认仍保留人工审核入口
- [ ] 已确认 `max_iterations <= 5`
- [ ] 已确认 `timeout_minutes <= 30`
- [ ] `npm run workflow:validate:all` 当前为 `0 warning / 0 error`

## G. 如果导入后表现和预期不一致

优先顺序：

1. [ ] 先看 execution history
2. [ ] 再核对节点版本和节点类型
3. [ ] 再核对子 workflow 绑定
4. [ ] 最后再改导出 JSON

不要在没有看到 execution 证据前，盲目重写 workflow。
