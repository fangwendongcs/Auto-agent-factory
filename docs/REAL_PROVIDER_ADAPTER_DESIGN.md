# REAL_PROVIDER_ADAPTER_DESIGN

## 1. 设计目标

这个阶段的目标不是直接让 agent 长时间自动工作，也不是立刻把真实 provider 接进生产链路。  
当前阶段只做一件事：

> 为 `[GoalDriven] 02 Agent Task Executor` 建立一个 **可控、可分阶段演进、可回退** 的 provider adapter 结构。

必须长期保留三种模式：

1. `mock`
2. `dry-run`
3. `real-readonly`

后续如果进入真正会产生副作用的执行阶段，再单独新增受控的 `real` 模式。当前 V0.3a 只验证“真实 provider 只读分析”的结构，不提前开放真实执行能力。

优先级固定为：

1. `mock mode` 永远可用
2. `dry-run mode` 必须先于 `real mode`
3. `real-readonly mode` 必须只读、受限、可审查

这意味着：

- `mock` 是 contract 与回归测试基线
- `dry-run` 是真实 provider 接入前的安全缓冲层
- `real-readonly` 不是默认路径，而是需要审批、只读、可审查的分析路径

## 2. 当前 Executor 现状

当前 `[GoalDriven] 02 Agent Task Executor` 的职责是：

1. 接收：
   - `run_id`
   - `task_id`
   - `goal`
   - `criteria`
   - `context`
   - `iteration`
2. 在 `Prompt Builder` 中构造 prompt reference
3. 由 `Mock Agent Adapter` 生成 mock `agent_result`
4. 输出：
   - `artifacts`
   - `evidence`
   - `known_issues`
5. 将标准化结果交给 `[GoalDriven] 03 Criteria Checker` 验收

当前节点链路：

```text
When Executed by Another Workflow
→ Task Validator
→ Prompt Builder
→ Mock Agent Adapter
→ Execution Logger
```

当前设计的优点：

- 简单
- 可测试
- contract 稳定
- 不依赖真实 provider

当前设计的局限：

- 还没有 `dry-run`
- 还没有 provider 选择层
- 还没有 real provider 的统一输出标准化边界

## 3. 目标模式设计

### 3.1 mock

用途：

- 验证 workflow contract
- 做本地 / 回归测试
- 在真实 provider 不可用时提供稳定 fallback

规则：

- 不调用外部 provider
- 不产生真实副作用
- 返回固定模拟结果
- 必须持续通过现有测试

### 3.2 dry-run

用途：

- 在接真实 provider 前验证 prompt、策略和安全边界
- 让系统展示“它准备做什么”，而不是“立刻去做”

规则：

- 可以调用 provider，也可以不调用 provider
- 不能修改真实文件
- 不能执行真实任务
- 只生成：
  - `plan`
  - `intended_actions`
  - `risk_summary`
- 必须返回标准 `agent_result`

建议：

- 第一版 `dry-run` 优先不依赖外部 API
- 即使未来接 provider，也应先把输出限制在计划层，而不是执行层

### 3.3 real-readonly

用途：

- 在真正接入真实 provider 之前，先验证“只读分析”这条路径的 contract 与编排结构

规则：

- 当前 V0.3a 只实现 stub，不调用真实 provider
- 未来即使接入真实 provider，也只能生成只读分析结果
- 只允许输出：
  - `summary`
  - `intended_actions`
  - `evidence`
  - `risk_summary`
- 必须经过人工审批门
- 不能写文件
- 不能执行终端命令
- 不能修改 Git
- 不能调用外部写接口
- 必须返回标准 `agent_result`
- 默认应关闭，不能成为隐式默认分支

## 4. Agent Result Contract

无论 provider 是 mock、dry-run 还是 real-readonly，最终都必须标准化成同一份结构：

```json
{
  "run_id": "...",
  "task_id": "...",
  "status": "completed | partial | failed | needs_review",
  "summary": "...",
  "artifacts": [],
  "known_issues": [],
  "evidence": [
    {
      "criterion": "...",
      "status": "pass | fail | unknown",
      "detail": "..."
    }
  ],
  "provider": {
    "mode": "mock | dry-run | real-readonly",
    "name": "...",
    "model": "...",
    "request_id": "...",
    "latency_ms": 0
  },
  "safety": {
    "risk_level": "low | medium | high",
    "requires_human_approval": true,
    "approved": false,
    "blocked_reason": null
  }
}
```

### 4.1 contract 约束

- `status` 必须可枚举，不能返回自由文本
- `evidence` 必须逐项对应 `criteria`
- `provider.mode` 必须显式可见
- `safety` 必须显式记录：
  - 风险级别
  - 是否需要人工审批
  - 是否已批准
  - 若被阻断，原因是什么

### 4.2 允许追加但不允许破坏

后续可以增加：

- `usage`
- `cost`
- `raw_response_ref`
- `warnings`

但不能破坏已有字段，也不能让下游改成依赖某个厂商专属格式。

## 5. 与 Criteria Checker 的兼容性

`[GoalDriven] 03 Criteria Checker` 不应该感知 provider 类型。  
它只应该依赖：

- `criteria`
- `agent_result.evidence`
- `agent_result.status`
- `known_issues`

因此：

- 任何外部 provider 的原始返回，都必须先被 adapter 标准化成 `agent_result`
- Criteria Checker 不应该知道：
  - 当前是 OpenAI
  - 还是 Claude
  - 还是本地 HTTP agent
  - 还是 Codex 手动触发型 adapter

这会带来两个好处：

1. provider 可以替换
2. checker contract 可以稳定

## 6. n8n 节点结构建议

下一轮推荐把 `[GoalDriven] 02 Agent Task Executor` 演进为：

```text
When Executed by Another Workflow
→ Task Validator
→ Prompt Builder
→ Mode Router
   ├─ Mock Agent Adapter
   ├─ Dry-run Provider Adapter
   └─ Real-readonly Provider Adapter
→ Result Normalizer
→ Execution Logger
```

本轮**不修改 workflow JSON**。  
以下只是下一轮实施蓝图。

| 节点 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `When Executed by Another Workflow` | 上游任务 payload | 原始输入 | 子 workflow 入口 |
| `Task Validator` | `run_id / task_id / goal / criteria / iteration / status` | 校验后的 task input + `validation_errors` | 拦截不完整任务 |
| `Prompt Builder` | task input + context | prompt reference + provider intent | 继续保留 provider 无关 prompt 结构 |
| `Mode Router` | `agent_mode` / `provider_mode` | 三种模式分支 | 明确决定 mock / dry-run / real-readonly |
| `Mock Agent Adapter` | 标准 task input | mock raw result | 继续保留当前基线 |
| `Dry-run Provider Adapter` | 标准 task input | plan / intended actions / risk summary | 不产生真实副作用 |
| `Real-readonly Provider Adapter` | 标准 task input + approval | read-only analysis result | 当前阶段只做 stub，不执行真实动作 |
| `Result Normalizer` | adapter raw result | 标准 `agent_result` | 所有 provider 必须经过这里 |
| `Execution Logger` | 标准结果 | 带日志的最终输出 | 记录摘要，不记录密钥 |

### 6.1 Mode Router 规则建议

优先级建议：

```text
context.provider_mode
→ context.agent_mode
→ input.provider_mode
→ input.agent_mode
→ default "mock"
```

并且：

- 未识别模式要 fallback 到 `mock`，并保留 `mode_warnings`
- `real-readonly` 若没有人工审批，也只能返回 `needs_review`

## 7. Credential / Secret 设计

安全原则：

- provider API key 不能写入 workflow JSON
- provider API key 不能写入 README / docs
- provider API key 不能提交到 Git
- 优先使用 n8n Credentials
- 本地测试可使用 `.env.local`
- `.env.local` 必须被 `.gitignore` 忽略
- 日志不能输出完整 key

### 7.1 推荐做法

生产环境：

```text
n8n Credentials
```

本地临时测试：

```text
.env.local
```

但仓库中只允许出现：

- credential 名称
- 环境变量名
- 明显占位符

不允许出现真实值。

## 8. Provider 选择建议

当前阶段先不绑定具体厂商。  
建议先定义一个 provider interface：

```text
provider_name
provider_mode
endpoint / credential_name
model
timeout
max_tokens / cost_limit
response_normalizer
```

可选 provider：

- OpenAI
- OpenRouter
- DeepSeek
- Claude
- 本地 HTTP agent
- Codex 手动触发型 adapter

### 8.1 设计原则

- 先抽象 contract，再接厂商
- 先证明 adapter 能换，再讨论谁最强
- 任何 provider 都必须被 normalizer 收敛到同一个 `agent_result`

## 9. 最小实施路线

### 阶段 1：加 `Mode Router`，但仍只走 mock

- 目标：
  - 建立模式分流骨架
  - 保持现有行为不变
- 禁止：
  - 接真实 API
  - 引入真实副作用

### 阶段 2：加 `dry-run adapter`

- 目标：
  - 返回 `plan`
  - 返回 `intended_actions`
  - 返回 `risk_summary`
- 要求：
  - 不执行真实动作
  - 仍输出标准 `agent_result`

### 阶段 3：加 `real-readonly adapter`，但默认关闭

- 目标：
  - 建立只读 provider 接入口
- 要求：
  - 默认不走 real-readonly
  - 即使接入真实 provider，也只能做只读分析
  - 没有审批时不进入任何真实执行
  - 失败必须结构化返回

### 阶段 4：再单独评估是否需要受控 `real` 执行模式

- 目标：
  - 在受控边界内验证真实执行
- 要求：
  - 低风险
  - 可回滚
  - 可观察
  - 有成本上限

## 10. 验收标准

Real Provider Adapter Design 完成后，下一轮实施必须满足：

- [ ] mock 模式仍然通过现有测试
- [ ] dry-run 模式不产生真实副作用
- [ ] real-readonly 模式默认关闭
- [ ] real-readonly 模式必须经过人工审批
- [ ] `agent_result` contract 不变
- [ ] Criteria Checker 不需要修改
- [ ] Error Handler 仍然可触发
- [ ] `workflow:validate:all` 仍然 `0 warning / 0 error`

## 11. 风险清单

| 风险 | 说明 | 预防方向 |
|---|---|---|
| 成本失控 | provider 调用次数和 token 消耗扩大 | `max_iterations`、`cost_limit`、dry-run 优先 |
| 无限循环 | agent 一直“继续尝试” | 停止条件、最大迭代、人工终止 |
| provider 返回格式不稳定 | 下游 contract 被破坏 | `Result Normalizer` 统一标准化 |
| API key 泄露 | secret 进入 JSON / docs / logs | n8n Credentials、环境变量、脱敏日志 |
| 执行真实副作用 | real-readonly 被误用成执行模式 | 默认关闭、只读约束、人工审批 |
| 人工审核绕过 | 高风险任务直接执行 | fail closed、审批字段显式校验 |
| Error Handler 不覆盖 provider 错误 | 外部失败无法追踪 | 结构化错误、统一错误出口 |
| 跨 n8n 实例 credential 丢失 | workflow 导入后凭据失效 | 导入后重新绑定 credential 与子 workflow |

## 12. 下一轮实施建议

当前 V0.3a 最适合只做：

1. 在 executor workflow 里加 `Mode Router`
2. 保留 `mock` 路径
3. 新增 `dry-run adapter`
4. 新增 `real-readonly stub`
5. 不接真实 provider

下一轮仍应坚持：

- 小步修改
- 只做 executor 局部演进
- 不改 Criteria Checker contract
- 不引入真实 API key
- 不让真实执行能力抢跑到设计前面

## 13. V0.3a 实施状态

当前 V0.3a 的目标是：

```text
mock
dry-run
real-readonly stub
```

三种模式共存，且全部汇入同一个 `Result Normalizer`。

当前阶段仍然明确禁止：

- 真实 provider 调用
- API key / credential 接入
- 任何文件写入、终端命令、Git 修改或外部写接口
