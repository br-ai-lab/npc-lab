# Issue 10 进度

| 编号 | 任务 | 负责角色 | 优先级 | 依赖 | 状态 | 验收标准 | 证据 |
|---|---|---|---|---|---|---|---|
| T1 | 识别制度图片并生成 Markdown | npc-ocr | P0 | 无 | 已完成 | `docs/公司访客管理制度.md` 覆盖七章、条目完整 | `docs/公司访客管理制度.md`，提交 `dc13a8e` |
| T2 | Java + SQLite 后端 API | npc-java | P0 | T1 | 已完成 | `backend/` 构建通过，接口符合契约 | `61d7b34`，`mvn test` 9/9 通过，curl 全流程验证 |
| T3 | React 前端 | npc-react | P0 | T1 | 已完成 | `frontend/` 构建通过，四个页面可用 | `20b5ab9`，构建通过，14/14 浏览器自测；契约字段核对一致 |
| T4 | Playwright E2E + API 测试 | npc-qa | P0 | T2,T3 | 待开始 | 测试真实执行并报告结果 | run `43203853087`、`43204355539` 建 App token 404；run `43345860177` 起服务后 29 分钟被取消、未提交；第 8 轮用新 workflow 再次派发 |
| T5 | 系统运行与使用说明 | npc-ocr | P2 | T2,T3 | 已完成 | `docs/visitor-system.md` 完整 | `cec05e2`，PM 核对配置与代码一致 |

状态只使用：待开始 / 进行中 / 已完成 / 阻塞。

## 轮次记录

- 第 1 轮：T1 完成（npc-ocr，提交 `dc13a8e`）。
- 第 2 轮：并行派发 T2（npc-java）与 T3（npc-react）。
- 第 3 轮：T2 已验收（npc-java，提交 `61d7b34`）；T3 仍在并行 workflow 中执行（run `43191156508`），本轮不重复派发，等待其汇报。
- 第 4 轮：T3 首次运行卡住，经人类确认已取消（`frontend/` 不存在）。按人类要求重新派发 React 任务（T3）；T4 依赖 T3 未完成，验收后立即派发。
- 第 5 轮：T3 已验收（npc-react，提交 `20b5ab9`）。并行派发 T4（npc-qa）与 T5（npc-ocr）。
- 第 6 轮：T5 已验收（npc-ocr，提交 `cec05e2`）。T4 的 QA workflow run `43203853087` 在创建 GitHub App token 阶段 404 失败（`get-a-repository-installation-for-the-authenticated-app`），agent 未启动、`tests/visitor-e2e/` 未产出；判定为基础设施瞬时故障（同期 OCR run 成功），重新派发 T4。
- 第 7 轮：T4 重新派发后的 QA workflow run `43204355539` 在同一处再次失败——Playwright 安装成功，但 `./.github/actions/npc-agent` 内 `actions/create-github-app-token` 返回 404 `get-a-repository-installation-for-the-authenticated-app`，agent 8 秒内退出，仍无产出。应人类要求第 3 次派发 T4；该故障连续两次复现，若再次失败需人类核查 QA GitHub App 是否安装在 `br-ai-lab/npc-lab` 及 `NPC_QA_APP_ID`/`NPC_QA_PRIVATE_KEY` Secret。
- 第 8 轮：第 7 轮派发的 QA workflow run `43345860177`（01:33–02:04 UTC）App token 正常、agent 启动并实际拉起后端与前端，但在约 29 分钟时被取消（超时）：`tests/visitor-e2e/` 无提交，也无汇报。人类已将 workflow 改为预装依赖 + 预启动服务 + QA 35 分钟预算；PM 合并 `main` 的基础设施变更到 `ai-npcs/issue-10`（否则 checkout 测试分支后 `node scripts/prepare-env.mjs` / `scripts/services.mjs` 因文件缺失直接失败），并第 4 次派发 T4（npc-qa）。
