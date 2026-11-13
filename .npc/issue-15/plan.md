# Issue 15 计划

## 需求

来源：Issue #15（作者 xieyajie）

1. 识别根目录 `assets/公司访客管理制度.png`，把制度转成 Markdown 存进仓库。
2. 根据制度内容开发「公司访客管理电子系统」：
   - 两个代码目录：`frontend/`（React）、`backend/`（Java）
   - 数据库：SQLite
   - 后端：Java（Spring Boot）
   - 前端：React（Vite）
   - 其余不限，由团队自行规划

## 制度要点（来自图片，供开发参考；以 T1 产出的 Markdown 为准）

- 登记信息：姓名、联系电话、所属单位、被访人、来访事由、进入时间
- 进入：前台联系被访员工确认，未确认不得进入；进入后原则上由员工陪同
- 离开：登记离开时间，归还临时访客证或其他物品
- 其他规定与附则

## 架构约定

- 后端目录：`backend/`，Spring Boot 3.x + Java 17 + SQLite（`backend/data/visitor.db`）
- 前端目录：`frontend/`，Vite + React 18，开发端口 5173，通过 Vite proxy 调后端
- 后端端口：8080
- 制度文档：`docs/visitor-management-policy.md`
- 目录名固定为 `backend/`、`frontend/`，与 `.npc/issue-15/services.json` 及 workflow 默认检测一致

### 接口约定（T2 实现，T3 消费）

Base URL：`http://localhost:8080`

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 健康检查，返回 `{"status":"UP"}` |
| POST | `/api/visitors` | 访客登记 |
| GET | `/api/visitors?status=&keyword=&date=` | 列表，支持按状态/关键字（姓名/单位/被访人）/日期过滤 |
| GET | `/api/visitors/{id}` | 详情 |
| POST | `/api/visitors/{id}/approve` | 前台确认进入 |
| POST | `/api/visitors/{id}/reject` | 拒绝进入（可带 reason） |
| POST | `/api/visitors/{id}/checkout` | 登记离开（可带 badgeReturned） |
| GET | `/api/visitors/stats` | 今日统计：总来访、待确认、在访、已离开 |

字段：`id, name, phone, company, hostName, purpose, entryTime, status, leaveTime, badgeReturned, approvedAt, createdAt, updatedAt`

`status` 取值：`PENDING`（待确认）/ `APPROVED`（已确认，在访）/ `REJECTED`（已拒绝）/ `LEFT`（已离开）

### 后端实现补充（T2 汇报，T3/T4 对齐用）

- `GET /api/visitors` 直接返回 JSON 数组，无外层包装。
- `GET /api/visitors/stats` 键名：`date, total, pending, inVisit, left, rejected`，另附兼容字段 `approved`（与 `inVisit` 同值）；`total` 为今日登记总数（含已拒绝）。
- approve/reject/checkout 均返回更新后的访客对象；额外字段 `rejectReason` 保存拒绝原因。
- 时间统一 ISO-8601 本地时间字符串（如 `2026-11-13T09:00:00`）。
- 状态机非法流转 409、不存在 404、参数错误 400（含 `message` + `fieldErrors`）。

## 任务表

| 编号 | 任务 | 负责角色 | 优先级 | 依赖 | 状态 | 验收标准 | 证据 |
|---|---|---|---|---|---|---|---|
| T1 | OCR 识别 `assets/公司访客管理制度.png`，整理为 `docs/visitor-management-policy.md` | npc-ocr | P0 | 无 | 已完成 | 七个章节（目的、适用范围、访客登记、进入公司、离开公司、其他规定、附则）完整；登记字段齐全；Markdown 结构清晰、可读 | `docs/visitor-management-policy.md`，提交 `d4a7946` |
| T2 | Java 后端：Spring Boot + SQLite 访客管理 API | npc-java | P0 | T1 ✅ | 已完成 | `backend/` 可构建；`/health` 返回 UP；登记/列表/确认/拒绝/离开/统计接口可用；字段校验与错误 JSON；SQLite 持久化；`mvn -q -DskipTests package` 通过 | `backend/`，提交 `70a3ddd`；`mvn test` 8/8 通过；curl 实测主流程、409、400、404、过滤、CORS、重启持久化均通过 |
| T3a | React 前端第一阶段：工程脚手架 + API 客户端 + 登记表单 + 今日统计看板 | npc-react | P0 | T1 ✅ | 待开始 | `frontend/` 可 `npm run build`；`npm run dev` 可访问；登记表单六字段 + 必填校验 + 中文错误提示；统计看板读取 `/api/visitors/stats` 并正确显示四个数字；接口不可用时显示可读错误 | - |
| T3b | React 前端第二阶段：访客列表 + 筛选 + 确认/拒绝/离开操作 + 响应式 + README | npc-react | P0 | T3a | 待开始 | 列表表格 + 状态/关键字/日期筛选；行内确认/拒绝/离开（含访客证归还勾选）按状态禁用非法操作；状态颜色标签；操作成功/失败提示；窄屏可用；`frontend/README.md` 齐全 | - |
| T4 | Playwright 端到端测试 | npc-qa | P1 | T2 ✅,T3b | 待开始 | `tests/visitor-e2e` 可运行；覆盖登记→列表→确认→离开主流程与至少 1 个校验/异常用例；记录真实通过/失败数 | - |

## 派发顺序

1. ✅ 先派 T1（npc-ocr）——制度文本是后续任务的需求依据。
2. ✅ T1 完成并核对后，并行派 T2（npc-java）与 T3（npc-react）。
3. ✅ T2 已完成。
4. ⏳ 原 T3 超时被停止且无任何产出（`frontend/` 不存在），已拆分为 T3a → T3b 串行执行，每轮范围更小以适配 25 分钟预算。
5. T3b 完成后派 T4（npc-qa）。
6. 测试通过后汇总，PR 交由人类 review。

## T3 拆分说明

- 原 T3 一次性覆盖脚手架、表单、列表、筛选、三类操作、统计、响应式、README，单轮超出 25 分钟预算。
- T3a（本轮派发）：工程可运行 + API 客户端 + 登记表单 + 统计看板，形成最小可跑闭环。
- T3b（T3a 汇报后派发）：在 T3a 结构上补列表、筛选、确认/拒绝/离开、响应式与 README。
- 两者写同一目录，必须串行，不能并行派发。

## 备注

- 若 T2/T3 对接口有分歧，以本计划的「接口约定」为准，并回帖 @npc-pm 同步。
- 不改 `main`；不合并 PR。
