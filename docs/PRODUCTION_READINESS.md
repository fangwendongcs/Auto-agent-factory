# PRODUCTION_READINESS

## 1. 目的

这份清单用于判断 `Goal-Driven Agent Workflow with n8n` 是否已经准备好从 **mock-first MVP** 进入真实 provider 接入阶段。  
它不是部署说明书，而是一个 **Go / No-Go 门槛**：

- 先确认当前基线是否稳定
- 再确认 credential、webhook、日志、回滚和迁移风险是否可控
- 最后再决定是否允许继续接入真实执行能力

## 2. 当前可发布状态

当前已经验证完成：

- [x] mock-first MVP 已验证
- [x] Production Webhook smoke test passed
- [x] Error Handler verified
- [x] Human approval gate verified
- [x] `workflow:validate:all` 为 `0 warning / 0 error`

这说明当前 mock-first 版本已经具备：

- 可导入
- 可联调
- 可失败回收
- 可人工拦截
- 可回归验证

但这**不等于**已经可以直接接入真实 provider。真实 provider 接入前，仍需完成下面的发布前检查。

## 3. Workflow 发布状态检查

- [ ] `[GoalDriven] 01 Master` 已按预期 Published / Active
- [ ] `[GoalDriven] 02 Agent Task Executor` 已按预期 Published / Active
- [ ] `[GoalDriven] 03 Criteria Checker` 已按预期 Published / Active
- [ ] `[GoalDriven] 04 Error Handler` 可作为 Master 的 Error Workflow 使用
- [ ] Master 中两个 `Execute Sub-workflow` 绑定仍指向正确的 02 / 03
- [ ] Master 的 Error Workflow 仍指向正确的 04

跨 n8n 实例导入后，必须重新复核：

1. `[GoalDriven] 01 Master` → `[GoalDriven] 02 Agent Task Executor`
2. `[GoalDriven] 01 Master` → `[GoalDriven] 03 Criteria Checker`
3. `[GoalDriven] 01 Master` → `[GoalDriven] 04 Error Handler`

原因：

- 不同 n8n 实例会生成不同 workflow ID
- 导出的 JSON 可能保留原实例 ID
- 同名 workflow 不等于绑定一定正确

## 4. Credential / Secret 安全检查

- [ ] 不允许 API key 写入 workflow JSON
- [ ] 不允许 API key 写入 `README.md` 或 `docs/`
- [ ] 不允许 API key 提交到 Git
- [ ] `.env` / `.env.local` / `.env.*` 已被 `.gitignore` 忽略
- [ ] 真实 provider key 只放在 n8n Credentials 或本地环境变量中
- [ ] 日志、execution 输出和截图中没有暴露真实 secret
- [ ] 如果使用 webhook secret / bearer token，已确认不会被写进仓库文档或示例 payload

推荐原则：

```text
Secrets live in credentials or environment variables.
Workflow JSON and Git only store references, never real values.
```

## 5. Webhook 安全检查

当前验证阶段：

- Production Webhook URL 仍为本地 `localhost`
- 当前只适合本地联调，不代表可直接裸露到公网

如果未来部署到公网，至少需要确认：

- [ ] 已启用认证或 token 校验
- [ ] 已考虑 IP 限制 / allowlist
- [ ] 已考虑 rate limit
- [ ] 已确认不会裸露无认证 webhook
- [ ] 已定义异常 payload 的拒绝策略
- [ ] high-risk payload 仍必须经过人工审核门

不建议：

- 直接公开无认证 webhook
- 为了“方便测试”长期关闭鉴权
- 让高风险任务绕过人工确认直接进入真实执行

## 6. Execution / Logging 检查

- [ ] execution history 已保留，且可用于失败排查
- [ ] execution 日志中不会记录真实 API key / token / password
- [ ] Error Handler 输出包含可定位问题的 error context
- [ ] 能定位：
  - failed node
  - workflow name
  - execution id
- [ ] 失败后能区分：
  - 输入问题
  - provider 问题
  - workflow 配置问题
  - 人工审批阻断

当前已验证：

- `[GoalDriven] 04 Error Handler` 已能接收到失败上下文
- Error Handler execution 中可用于排查的字段已经存在

## 7. Rollback / Restore 检查

### 7.1 从 Git 恢复 workflow JSON

出现问题时，先定位最近一个稳定提交：

```bash
git log --oneline
```

然后从 Git 取回对应版本的标准 JSON：

```text
workflows/goal_driven_master.workflow.json
workflows/agent_task_executor.workflow.json
workflows/criteria_checker.workflow.json
workflows/error_handler.workflow.json
```

### 7.2 在 n8n UI 中恢复

1. 停用 / 取消发布有问题的 workflow
2. 重新导入稳定版 JSON
3. 重新绑定：
   - Master → 02
   - Master → 03
   - Master → 04 Error Workflow
4. 先手动执行验证
5. 再用 Production Webhook 做最小 smoke test

### 7.3 回滚到上一个 Git commit

- [ ] 已确认最近一个稳定 commit hash
- [ ] 已确认可以通过 revert 或新的修复提交回滚
- [ ] 不依赖破坏历史的 `git reset --hard`

### 7.4 停用 Production Webhook

- [ ] 知道如何将 `[GoalDriven] 01 Master` 取消发布 / 设为 inactive
- [ ] 知道停用后 Production Webhook 将不再接受自动触发
- [ ] 已记录停用前需要通知谁、检查什么

## 8. Real Provider 接入前置条件

- [ ] mock 模式继续保留
- [ ] dry-run 优先于 real 模式
- [ ] real provider 输出会被标准化成 `agent_result`
- [ ] 不破坏 `[GoalDriven] 03 Criteria Checker` 现有 contract
- [ ] `max_iterations <= 5`
- [ ] `timeout_minutes <= 30`
- [ ] 高风险任务必须人工审批
- [ ] 真实执行前建议人工确认 plan
- [ ] provider 失败时能返回结构化错误，而不是让系统无解释崩溃
- [ ] 已定义真实 provider 失败后的 fallback / retry / stop 策略

推荐演进顺序：

1. 保留 mock path
2. 新增 provider adapter
3. 先 dry-run
4. 再引入最小真实调用
5. 最后才考虑更高自治度

## 9. Go / No-Go Checklist

### 9.1 是否允许保持 Published

- [ ] 当前 4 个 workflow 的发布状态都已复核
- [ ] Production Webhook 正常 payload 已验证
- [ ] Error Handler 自动触发已验证
- [ ] high-risk 人工审批拦截已验证
- [ ] 最近一次本地校验全部通过

结论：

- [ ] Go：允许保持 Published
- [ ] No-Go：先修复问题，再重新验证

### 9.2 是否允许接入真实 provider

- [ ] mock path 仍保留
- [ ] dry-run 方案已定义
- [ ] credential 存放方案已确认
- [ ] provider 输出契约已定义为 `agent_result`
- [ ] 失败 / 回滚策略已明确

结论：

- [ ] Go：允许开始 real provider adapter 设计
- [ ] No-Go：先补齐前置条件

### 9.3 是否允许暴露公网 webhook

- [ ] 认证方案已确定
- [ ] token / secret 管理方案已确定
- [ ] rate limit 已考虑
- [ ] 高风险 payload 仍保留人工审核
- [ ] 已确认不会裸露无认证入口

结论：

- [ ] Go：允许进入公网发布评估
- [ ] No-Go：继续保持本地 / 内网使用

### 9.4 是否允许自动多轮循环

- [ ] `max_iterations <= 5`
- [ ] `timeout_minutes <= 30`
- [ ] 人工停止机制存在
- [ ] 失败后不会无限重试
- [ ] 真实 provider 成本已评估
- [ ] 每轮输出仍可审查、可追踪、可回滚

结论：

- [ ] Go：允许在受控范围内启用多轮
- [ ] No-Go：继续保持人工确认优先

## 10. 当前建议

当前更适合的路线是：

1. 维持现有 mock-first 基线
2. 完成 credential / webhook / rollback 复核
3. 设计最小 provider adapter
4. 先 dry-run，再 real-run
5. 在确认 contract、日志和成本都稳定后，再逐步提高自动化程度
