# Issue 10 进度

| 编号 | 任务 | 负责角色 | 优先级 | 依赖 | 状态 | 验收标准 | 证据 |
|---|---|---|---|---|---|---|---|
| T1 | 识别制度图片并生成 Markdown | npc-ocr | P0 | 无 | 已完成 | `docs/公司访客管理制度.md` 覆盖七章、条目完整 | `docs/公司访客管理制度.md`，提交 `dc13a8e` |
| T2 | Java + SQLite 后端 API | npc-java | P0 | T1 | 已完成 | `backend/` 构建通过，接口符合契约 | `61d7b34`，`mvn test` 9/9 通过，curl 全流程验证 |
| T3 | React 前端 | npc-react | P0 | T1 | 已完成 | `frontend/` 构建通过，四个页面可用 | `20b5ab9`，构建通过，14/14 浏览器自测；契约字段核对一致 |
| T4 | Playwright E2E + API 测试 | npc-qa | P0 | T2,T3 | 进行中 | 测试真实执行并报告结果 | 第 5 轮派发 |
| T5 | 系统运行与使用说明 | npc-ocr | P2 | T2,T3 | 进行中 | `docs/visitor-system.md` 完整 | 第 5 轮派发 |

状态只使用：待开始 / 进行中 / 已完成 / 阻塞。

## 轮次记录

- 第 1 轮：T1 完成（npc-ocr，提交 `dc13a8e`）。
- 第 2 轮：并行派发 T2（npc-java）与 T3（npc-react）。
- 第 3 轮：T2 已验收（npc-java，提交 `61d7b34`）；T3 仍在并行 workflow 中执行（run `43191156508`），本轮不重复派发，等待其汇报。
- 第 4 轮：T3 首次运行卡住，经人类确认已取消（`frontend/` 不存在）。按人类要求重新派发 React 任务（T3）；T4 依赖 T3 未完成，验收后立即派发。
- 第 5 轮：T3 已验收（npc-react，提交 `20b5ab9`）。并行派发 T4（npc-qa）与 T5（npc-ocr）。
