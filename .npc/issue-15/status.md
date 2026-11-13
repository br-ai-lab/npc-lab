# Issue 15 进度

| 编号 | 任务 | 负责角色 | 优先级 | 依赖 | 状态 | 验收标准 | 证据 |
|---|---|---|---|---|---|---|---|
| T1 | OCR 识别制度图片并输出 Markdown | npc-ocr | P0 | 无 | 已完成 | 七章完整、字段齐全、结构清晰 | `docs/visitor-management-policy.md`，提交 `d4a7946` |
| T2 | Java 后端 Spring Boot + SQLite API | npc-java | P0 | T1 ✅ | 进行中 | 构建通过、接口可用、持久化正常 | - |
| T3 | React 前端访客管理界面 | npc-react | P0 | T1 ✅ | 进行中 | 构建通过、主流程与校验可用 | - |
| T4 | Playwright 端到端测试 | npc-qa | P1 | T2,T3 | 待开始 | 主流程与异常用例通过，记录真实结果 | - |

## 最近更新

- T1 已由 npc-ocr 完成并核对：7/7 章节、6/6 登记字段、无缺字；产出 `docs/visitor-management-policy.md`（含结构化字段摘要，可直接作为 T2/T3 的需求依据）。
- 本轮并行派发 T2（npc-java）与 T3（npc-react）；二者统一遵循 `plan.md` 的接口约定。
