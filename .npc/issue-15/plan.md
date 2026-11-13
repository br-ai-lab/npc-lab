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

## 任务表

| 编号 | 任务 | 负责角色 | 优先级 | 依赖 | 状态 | 验收标准 | 证据 |
|---|---|---|---|---|---|---|---|
| T1 | OCR 识别 `assets/公司访客管理制度.png`，整理为 `docs/visitor-management-policy.md` | npc-ocr | P0 | 无 | 已完成 | 七个章节（目的、适用范围、访客登记、进入公司、离开公司、其他规定、附则）完整；登记字段齐全；Markdown 结构清晰、可读 | `docs/visitor-management-policy.md`，提交 `d4a7946` |
| T2 | Java 后端：Spring Boot + SQLite 访客管理 API | npc-java | P0 | T1 ✅ | 进行中 | `backend/` 可构建；`/health` 返回 UP；登记/列表/确认/拒绝/离开/统计接口可用；字段校验与错误 JSON；SQLite 持久化；`mvn -q -DskipTests package` 通过 | - |
| T3 | React 前端：登记、列表、确认/拒绝、离开、统计页面 | npc-react | P0 | T1 ✅ | 进行中 | `frontend/` 可 `npm run build`；中文界面；登记表单字段与制度一致且有校验提示；列表支持状态/关键字/日期筛选；确认、拒绝、离开操作可用；错误提示清晰；响应式布局 | - |
| T4 | Playwright 端到端测试 | npc-qa | P1 | T2,T3 | 待开始 | `tests/visitor-e2e` 可运行；覆盖登记→列表→确认→离开主流程与至少 1 个校验/异常用例；记录真实通过/失败数 | - |

## 派发顺序

1. ✅ 先派 T1（npc-ocr）——制度文本是后续任务的需求依据。
2. ✅ T1 完成并核对后，并行派 T2（npc-java）与 T3（npc-react）。
3. T2、T3 均完成后派 T4（npc-qa）。
4. 测试通过后汇总，PR 交由人类 review。

## 备注

- 若 T2/T3 对接口有分歧，以本计划的「接口约定」为准，并回帖 @npc-pm 同步。
- 不改 `main`；不合并 PR。
