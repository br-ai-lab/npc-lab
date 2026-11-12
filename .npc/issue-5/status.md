# Issue 5 进度

| 编号 | 任务 | 负责角色 | 优先级 | 依赖 | 状态 | 验收标准 | 证据 |
|---|---|---|---|---|---|---|---|
| T1 | OCR 制度图片为 Markdown | npc-ocr | P0 | 无 | 已完成 | `docs/policy/company-visitor-management-policy.md` 七章齐全、原文无遗漏、附识别说明 | 文档已在仓库；PM 对照原图核对一致 |
| T2 | 后端骨架：Maven/Spring Boot/SQLite、数据模型、种子数据、登录与用户接口 | npc-java | P0 | T1 | 进行中 | `mvn test` 通过；登录成功/失败、`/api/users` 可验证 | - |
| T3 | 后端业务：访客/来访 API、状态机、校验、统计导出、curl 自测 | npc-java | P0 | T2 | 待开始 | 全量 API 契约实现；状态流转 409 正确；`mvn test` 通过 | - |
| T4 | 前端骨架：Vite/React/TS、登录、布局路由、axios 客户端 | npc-react | P0 | T1 | 进行中 | `npm run build` 通过；登录联调成功 | - |
| T5 | 前端页面：登记、确认、前台签到签退、记录、统计、制度、用户 | npc-react | P0 | T4 | 待开始 | 所有页面可操作、表单校验与错误提示完整、构建通过 | - |
| T6 | E2E 测试与验收 | npc-qa | P0 | T3,T5 | 待开始 | Playwright 真实执行；核心流程用例通过；证据存档 | - |
| T7 | 交付文档：运行手册与验收记录 | npc-ocr | P1 | T6 | 待开始 | `docs/visitor-system-runbook.md` 含启动步骤、账号、验证命令、已知问题 | - |

## 接力记录

| 次数 | 角色 | 动作 | 结果 |
|---|---|---|---|
| 1 | npc-pm | 分析 Issue、制定计划、拆解 T1–T7、派发 T1 | 完成 |
| 2 | npc-ocr | 执行 T1：OCR + 人工校对制度图片 | 完成，PM 已验收 |
| 3 | npc-pm | 验收 T1；并行派发 T2（后端骨架）与 T4（前端骨架） | 进行中 |
