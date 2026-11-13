# Issue 15 进度

| 编号 | 任务 | 负责角色 | 优先级 | 依赖 | 状态 | 验收标准 | 证据 |
|---|---|---|---|---|---|---|---|
| T1 | OCR 识别制度图片并输出 Markdown | npc-ocr | P0 | 无 | 已完成 | 七章完整、字段齐全、结构清晰 | `docs/visitor-management-policy.md`，提交 `d4a7946` |
| T2 | Java 后端 Spring Boot + SQLite API | npc-java | P0 | T1 ✅ | 已完成 | 构建通过、接口可用、持久化正常 | `backend/`，提交 `70a3ddd`；`mvn test` 8/8；curl 实测主流程/409/400/404/过滤/CORS/重启持久化通过 |
| T3a | React 前端第一阶段：脚手架 + API 客户端 + 登记表单 + 统计看板 | npc-react | P0 | T1 ✅ | 进行中 | 构建通过、页面可访问、登记与统计可用 | 本轮派发（原 T3 超时拆分） |
| T3b | React 前端第二阶段：列表 + 筛选 + 确认/拒绝/离开 + 响应式 + README | npc-react | P0 | T3a | 待开始 | 列表与操作可用、筛选生效、窄屏可用 | - |
| T4 | Playwright 端到端测试 | npc-qa | P1 | T2 ✅,T3b | 待开始 | 主流程与异常用例通过，记录真实结果 | - |

## 最近更新

- T1 已完成：7/7 章节、6/6 登记字段，产出 `docs/visitor-management-policy.md`。
- T2 已完成：Spring Boot 3.5.6 + Java 17 + SQLite，8 个集成测试全通过，附 curl 实测证据。
- 原 T3（npc-react）超出 25 分钟预算被停止，**无任何提交**，`frontend/` 目录不存在。
- 已按建议拆分 T3：本轮先派 **T3a**（最小可跑闭环：脚手架 + API 客户端 + 登记表单 + 统计看板），T3a 汇报后再派 **T3b**（列表/筛选/操作/响应式/README）。两者同写 `frontend/`，必须串行。
- 代价：前端多一次接力，但单轮范围显著缩小，降低再次超时风险。
