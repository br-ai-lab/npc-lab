# Issue 10 进度

| 编号 | 任务 | 负责角色 | 优先级 | 依赖 | 状态 | 验收标准 | 证据 |
|---|---|---|---|---|---|---|---|
| T1 | 识别制度图片并生成 Markdown | npc-ocr | P0 | 无 | 进行中 | `docs/公司访客管理制度.md` 覆盖七章、条目完整 | - |
| T2 | Java + SQLite 后端 API | npc-java | P0 | T1 | 待开始 | `backend/` 构建通过，接口符合契约 | - |
| T3 | React 前端 | npc-react | P0 | T1 | 待开始 | `frontend/` 构建通过，四个页面可用 | - |
| T4 | Playwright E2E + API 测试 | npc-qa | P0 | T2,T3 | 待开始 | 测试真实执行并报告结果 | - |
| T5 | 系统运行与使用说明 | npc-ocr | P2 | T2,T3 | 待开始 | `docs/visitor-system.md` 完整 | - |

状态只使用：待开始 / 进行中 / 已完成 / 阻塞。
