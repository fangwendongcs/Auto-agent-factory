# n8n 工作流安全检查清单

上线或导入前，至少确认以下事项：

1. 不要提交 API key
2. 不要在 workflow JSON 中写死 token
3. 不要自动激活高风险工作流
4. 不要允许 Agent 直接执行危险 shell 命令
5. 所有中高风险任务必须人工确认
6. 导出 n8n JSON 前检查 credential 名称和 HTTP header
7. Git diff 必须人工看过再合并
8. 每次上线前先 dry-run

## 补充建议

- `.env` 只保存在本地，不进入 Git
- 中高风险任务尽量拆小，不要一次改很多模块
- 高风险任务即使通过 Agent 审查，也应保留人类最终确认
- 如果 workflow 改动涉及 credential、生产 endpoint、自动提交或自动部署，优先视为高风险
- 执行日志中也不要输出真实 token、password 或 Authorization header

