# Issue 15 进度

| 编号 | 任务 | 负责角色 | 优先级 | 依赖 | 状态 | 验收标准 | 证据 |
|---|---|---|---|---|---|---|---|
| T1 | OCR 识别制度图片并输出 Markdown | npc-ocr | P0 | 无 | 已完成 | 七章完整、字段齐全、结构清晰 | `docs/visitor-management-policy.md`，提交 `d4a7946` |
| T2 | Java 后端 Spring Boot + SQLite API | npc-java | P0 | T1 ✅ | 已完成 | 构建通过、接口可用、持久化正常 | `backend/`，提交 `70a3ddd`；`mvn test` 8/8；curl 实测主流程/409/400/404/过滤/CORS/重启持久化通过 |
| T3 | React 前端访客管理界面 | npc-react | P0 | T1 ✅ | 进行中 | 构建通过、主流程与校验可用 | NPC React workflow 进行中，尚无提交 |
| T4 | Playwright 端到端测试 | npc-qa | P1 | T2 ✅,T3 | 待开始 | 主流程与异常用例通过，记录真实结果 | - |

## 最近更新

- T1 已由 npc-ocr 完成并核对：7/7 章节、6/6 登记字段、无缺字；产出 `docs/visitor-management-policy.md`（含结构化字段摘要，可直接作为 T2/T3 的需求依据）。
- T2 已由 npc-java 完成：Spring Boot 3.5.6 + Java 17 + SQLite，接口与 `plan.md` 约定一致，8 个集成测试全通过，并附 curl 实测证据（含非法状态流转 409、缺字段 400、重启后数据仍在）。接口细节补充已记入 `plan.md` 的「后端实现补充」。
- T3（npc-react）仍在执行中，本轮不重复派发；其汇报到达后立即派发 T4（npc-qa）。
