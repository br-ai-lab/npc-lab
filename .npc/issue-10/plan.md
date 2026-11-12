# Issue 10 计划：公司访客管理制度 → 访客管理电子系统

## 目标

1. 识别根目录图片 `assets/公司访客管理制度.png`，转为 Markdown 存入 `docs/`。
2. 依据制度内容，开发一套公司访客管理电子系统：
   - 后端：Java（Spring Boot）+ SQLite，目录 `backend/`
   - 前端：React（Vite），目录 `frontend/`
   - 测试：Playwright E2E + API 测试，目录 `tests/visitor-e2e/`
   - 文档：制度原文、系统运行与使用说明，目录 `docs/`

## 制度要点（来自图片，最终以 T1 输出的 Markdown 为准）

- 目的：维护办公秩序，保障人员及财产安全。
- 适用范围：客户、供应商、面试人员、维修人员及其他外来访客。
- 访客登记项：姓名、联系电话、所属单位、被访人、来访事由、进入时间。
- 进入公司：前台须联系被访员工确认；未确认不得进入办公区域；进入后原则上由公司员工陪同，不得擅自进入无关区域。
- 离开公司：登记离开时间，并归还临时访客证或其他物品。
- 其他规定：不得影响正常办公，不得拍摄/复制/传播内部资料；异常行为可要求立即离开。
- 附则：自发布之日起执行，由行政部门负责解释和管理。

## 系统设计

### 目录结构

```text
backend/                     Spring Boot + SQLite 后端
frontend/                    React + Vite 前端
tests/visitor-e2e/           Playwright 端到端 + API 测试
docs/公司访客管理制度.md      T1 产出的制度 Markdown
docs/visitor-system.md       T5 产出的运行/使用说明
.npc/issue-10/               计划与进度（仅 PM 维护）
```

### 访客状态机

```text
PENDING（待确认） --confirm--> CONFIRMED（已确认，发访客证）
PENDING           --reject---> REJECTED（已拒绝）
CONFIRMED         --checkout-> LEFT（已离场，登记离开时间/归还访客证）
CONFIRMED         --force----> FORCED_OUT（异常行为，强制离场）
```

### 数据模型 `visitors`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | 访客记录 ID |
| name | TEXT NOT NULL | 姓名 |
| phone | TEXT NOT NULL | 联系电话 |
| organization | TEXT | 所属单位 |
| host_name | TEXT NOT NULL | 被访人 |
| purpose | TEXT NOT NULL | 来访事由 |
| entry_time | TEXT NOT NULL (ISO-8601) | 进入时间 |
| status | TEXT NOT NULL | PENDING/CONFIRMED/REJECTED/LEFT/FORCED_OUT |
| leave_time | TEXT | 离开时间 |
| badge_no | TEXT | 临时访客证编号 |
| badge_returned | INTEGER NOT NULL DEFAULT 0 | 是否归还访客证 |
| companion | TEXT | 陪同员工 |
| note | TEXT | 备注/拒绝或强制离场原因 |
| created_at | TEXT NOT NULL | 创建时间 |
| updated_at | TEXT NOT NULL | 更新时间 |

### REST API 契约（base `/api`，JSON）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/visitors` | 登记访客，必填 name/phone/hostName/purpose，entryTime 默认当前时间；返回 201，status=PENDING |
| GET | `/api/visitors?status=&date=YYYY-MM-DD&keyword=` | 列表，按 entryTime 倒序；keyword 匹配姓名/电话/单位/被访人 |
| GET | `/api/visitors/{id}` | 详情，不存在返回 404 |
| POST | `/api/visitors/{id}/confirm` | 确认进入，body `{companion?}`；生成 badgeNo（如 V20261112-001）；非 PENDING 返回 409 |
| POST | `/api/visitors/{id}/reject` | 拒绝进入，body `{reason?}`；非 PENDING 返回 409 |
| POST | `/api/visitors/{id}/checkout` | 离场，body `{badgeReturned:boolean}`；写入 leaveTime，status=LEFT；非 CONFIRMED 返回 409 |
| POST | `/api/visitors/{id}/force-leave` | 异常强制离场，body `{reason}`；status=FORCED_OUT；已结束状态返回 409 |
| GET | `/api/stats/today` | `{date,total,pending,confirmed,onSite,left,rejected,forcedOut,badgeOutstanding}` |
| GET | `/api/health` | `{status:"ok"}` |

约定：错误返回 `{timestamp,status,error,message,fieldErrors?}`；CORS 允许 `http://localhost:5173`、`http://127.0.0.1:5173`；后端端口 8080，SQLite 文件路径可配置（默认 `backend/data/visitor.db`）。

### 前端页面

| 路由 | 页面 | 要点 |
|---|---|---|
| `/` | 前台看板 | 今日统计卡片；待确认列表（确认/拒绝）；在访列表（离场/强制离场） |
| `/register` | 访客登记 | 姓名、电话、单位、被访人、事由、进入时间（默认当前）；提交后显示结果与状态 |
| `/visitors` | 访客记录 | 状态/日期/关键词筛选，表格，详情弹窗，离场登记（含访客证归还） |
| `/policy` | 制度说明 | 展示制度要点（内容取自 `docs/公司访客管理制度.md`） |

前端开发端口 5173，`/api` 代理到 `http://localhost:8080`；中文界面；状态用中文标签；加载/错误提示完整。

## 任务表

| 编号 | 任务 | 负责角色 | 优先级 | 依赖 | 状态 | 验收标准 | 证据 |
|---|---|---|---|---|---|---|---|
| T1 | 识别制度图片并生成 Markdown | npc-ocr | P0 | 无 | 进行中 | `docs/公司访客管理制度.md` 覆盖七章、条目完整、可读 | - |
| T2 | Java + SQLite 后端 API | npc-java | P0 | T1 | 待开始 | `backend/` 可 `mvn -q package`；接口与本文契约一致；有后端单测/自测记录 | - |
| T3 | React 前端 | npc-react | P0 | T1 | 待开始 | `frontend/` 可 `npm run build`；四个页面可用；联调契约一致 | - |
| T4 | Playwright E2E + API 测试 | npc-qa | P0 | T2,T3 | 待开始 | `tests/visitor-e2e/` 真实执行并给出通过/失败数与证据 | - |
| T5 | 系统运行与使用说明 | npc-ocr | P2 | T2,T3 | 待开始 | `docs/visitor-system.md` 含启动步骤、接口列表、操作流程、已知问题 | - |

## 接力计划

1. 第 1 轮：T1（npc-ocr）。
2. 第 2 轮：T2（npc-java）与 T3（npc-react）并行，二者只改各自目录。
3. 第 3 轮：T4（npc-qa）与 T5（npc-ocr）并行。
4. 第 4 轮：PM 汇总，PR 保持 Open 等人类 review。

## 约束

- 各角色只改自己目录；不改 `main`；不合并 PR。
- 接口契约以本文为准；如确需变更，先 @npc-pm 说明，由 PM 更新计划。
- 不伪造构建/测试结果。
