# 公司访客管理系统：运行与使用说明

本系统把《公司访客管理制度》的线下流程电子化：前台登记访客 → 联系被访员工确认 → 发放临时访客证 → 离场登记并归还访客证，异常情况可强制离场。

- 制度原文：[`docs/公司访客管理制度.md`](./公司访客管理制度.md)
- 系统设计、数据模型与接口契约：[`.npc/issue-10/plan.md`](../.npc/issue-10/plan.md)
- 后端代码：[`backend/`](../backend/)，说明见 [`backend/README.md`](../backend/README.md)
- 前端代码：[`frontend/`](../frontend/)，说明见 [`frontend/README.md`](../frontend/README.md)

## 一、系统概述与功能清单

### 功能

| 页面 | 路由 | 功能 |
|---|---|---|
| 前台看板 | `/` | 今日统计卡片；待确认访客（确认 / 拒绝，拒绝可填原因）；当前在访（离场并登记访客证归还、强制离场须填原因） |
| 访客登记 | `/register` | 登记姓名、联系电话、所属单位、被访人、来访事由、进入时间（默认当前时间）；提交后显示登记结果与状态 |
| 访客记录 | `/visitors` | 按状态 / 进入日期 / 关键词筛选；表格展示；详情弹窗；已确认访客可直接办理离场 |
| 制度说明 | `/policy` | 内嵌展示《公司访客管理制度》七章内容（内容取自制度 Markdown） |

其他：状态用中文标签与颜色区分（待确认 / 已确认 / 已拒绝 / 已离场 / 强制离场），加载中、空列表与接口错误均有中文提示；页面支持桌面与移动端布局。

### 访客状态机

```text
PENDING（待确认） --confirm-----> CONFIRMED（已确认，生成访客证号）
PENDING           --reject------> REJECTED（已拒绝）
CONFIRMED         --checkout----> LEFT（已离场，记录离开时间与访客证归还）
CONFIRMED         --force-leave-> FORCED_OUT（强制离场，记录原因）
```

状态流转由后端严格校验，非法流转（如对已离场记录再次离场）返回 HTTP `409`。`PENDING` 不能直接离场或强制离场。

### 目录结构

```text
backend/                 Spring Boot + SQLite 后端（端口 8080，接口前缀 /api）
frontend/                Vite + React 前端（开发端口 5173）
tests/visitor-e2e/       Playwright 端到端与 API 测试（T4 任务，独立测试工程）
docs/公司访客管理制度.md  制度原文（OCR 整理）
docs/visitor-system.md   本文
.npc/issue-10/           计划与进度
```

## 二、环境要求

版本依据 `backend/pom.xml` 与 `frontend/package.json` / `package-lock.json`：

| 依赖 | 要求 | 说明 |
|---|---|---|
| JDK | 17 及以上 | `pom.xml` 中 `<java.version>17</java.version>`；编译目标为 Java 17 字节码，更高版本 JDK 亦可构建运行 |
| Maven | 3.6.3 及以上 | 项目未附带 Maven Wrapper，需本机安装 `mvn` |
| Node.js | `^18.0.0` 或 `^20.0.0` 或 `>=22.0.0` | Vite 6 的 `engines` 要求；建议使用 Node 20 LTS 或 22 |
| npm | 随 Node.js 提供即可 | 前端依赖见 `frontend/package.json` |
| 浏览器 | 现代浏览器（Chrome / Edge / Firefox / Safari） | 前端为单页应用 |

后端技术栈：Spring Boot 3.5.6（Web / Validation / JDBC）+ `org.xerial:sqlite-jdbc` 3.46.1.3，数据库为本地 SQLite 文件，无需单独安装数据库服务。

## 三、启动步骤

### 1. 启动后端

方式一（开发常用）：

```bash
cd backend
mvn spring-boot:run
```

方式二（打包后运行）：

```bash
cd backend
mvn -q package
java -jar target/visitor-management-1.0.0.jar
```

启动后：

- 服务地址：`http://localhost:8080`
- 健康检查：`http://localhost:8080/api/health`，返回 `{"status":"ok"}`
- 数据库文件：默认 `backend/data/visitor.db`（以 `cd backend` 启动时为该路径）。首次启动自动建表，无需手工初始化。

#### 后端配置

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `VISITOR_DB_PATH`（环境变量） | `data/visitor.db` | SQLite 文件路径。相对路径基于**启动时的工作目录**解析，父目录会自动创建 |
| `server.port` | `8080` | 服务端口，可通过 `--server.port=8081` 或对应环境变量覆盖 |

示例：把数据库放到指定位置并在 8081 端口启动：

```bash
cd backend
VISITOR_DB_PATH=/data/visitor/visitor.db java -jar target/visitor-management-1.0.0.jar --server.port=8081
```

> 注意：修改后端端口后，前端开发代理仍指向 `8080`，需同步修改 `frontend/vite.config.js` 的 `server.proxy['/api'].target`；同时后端的 CORS 白名单只允许 `http://localhost:5173` 与 `http://127.0.0.1:5173` 两个来源。

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

浏览器访问 <http://localhost:5173>。开发服务器端口固定为 `5173`（`strictPort: true`，端口被占用时直接报错退出，不会自动换端口），`/api` 请求代理到 `http://localhost:8080`。

生产构建与预览：

```bash
cd frontend
npm run build     # 产物输出到 frontend/dist/
npm run preview   # 本地预览构建产物
```

> 生产部署时，需要由反向代理（如 Nginx）把 `/api` 转发到后端 8080，或另行配置前端接口地址；本仓库的 `/api` 代理仅用于 Vite 开发与预览服务器。

### 3. 测试

后端集成测试：

```bash
cd backend
mvn test
```

前端无独立测试脚本；端到端与接口测试工程位于 `tests/visitor-e2e/`（Playwright），启动方式见该目录下的 `README.md`。

## 四、接口列表

所有接口前缀 `/api`，请求与响应均为 JSON；时间字段为本地时间字符串，格式 `yyyy-MM-dd'T'HH:mm:ss`（如 `2026-11-12T09:27:29`）。

| 方法 | 路径 | 说明 | 关键请求字段 | 关键返回 |
|---|---|---|---|---|
| POST | `/api/visitors` | 登记访客，返回 `201` | `name`*、`phone`*、`hostName`*、`purpose`*；可选 `organization`、`entryTime`（缺省当前时间）、`note` | 完整访客记录，`status=PENDING` |
| GET | `/api/visitors` | 列表，按 `entryTime` 倒序 | 查询参数 `status`、`date=YYYY-MM-DD`、`keyword` | 访客记录数组 |
| GET | `/api/visitors/{id}` | 详情，不存在返回 `404` | — | 单条访客记录 |
| POST | `/api/visitors/{id}/confirm` | 确认进入，`PENDING → CONFIRMED` | 可选 `companion`（陪同员工） | 更新后的记录，含 `badgeNo` |
| POST | `/api/visitors/{id}/reject` | 拒绝进入，`PENDING → REJECTED` | 可选 `reason`（写入 `note`） | 更新后的记录 |
| POST | `/api/visitors/{id}/checkout` | 离场，`CONFIRMED → LEFT` | `badgeReturned`*（布尔，是否归还访客证） | 更新后的记录，含 `leaveTime` |
| POST | `/api/visitors/{id}/force-leave` | 强制离场，`CONFIRMED → FORCED_OUT` | `reason`*（必填，写入 `note`） | 更新后的记录，含 `leaveTime` |
| GET | `/api/stats/today` | 今日统计 | — | 统计对象，见下 |
| GET | `/api/health` | 健康检查 | — | `{"status":"ok"}` |

带 `*` 为必填。确认、拒绝接口的请求体可省略或传 `{}`。

列表筛选：

- `status`：`PENDING` / `CONFIRMED` / `REJECTED` / `LEFT` / `FORCED_OUT`，其他值返回 `400`；
- `date`：按 `entryTime` 的日期部分匹配，格式必须为 `YYYY-MM-DD`，否则返回 `400`；
- `keyword`：模糊匹配姓名、联系电话、所属单位、被访人；
- 结果按 `entryTime` 倒序，同一时间按 `id` 倒序；接口不分页。

访客对象字段（响应）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | 整数 | 登记编号 |
| `name` | 字符串 | 姓名 |
| `phone` | 字符串 | 联系电话 |
| `organization` | 字符串 / null | 所属单位 |
| `hostName` | 字符串 | 被访人 |
| `purpose` | 字符串 | 来访事由 |
| `entryTime` | 字符串 | 进入时间 |
| `status` | 字符串 | 状态枚举值 |
| `leaveTime` | 字符串 / null | 离开时间（离场或强制离场后写入） |
| `badgeNo` | 字符串 / null | 临时访客证号，确认时生成 |
| `badgeReturned` | 布尔 | 是否已归还访客证 |
| `companion` | 字符串 / null | 陪同员工 |
| `note` | 字符串 / null | 备注；拒绝原因或强制离场原因写入此字段 |
| `createdAt` / `updatedAt` | 字符串 | 创建 / 更新时间 |

今日统计字段：

| 字段 | 含义 |
|---|---|
| `date` | 统计日期 |
| `total` | 今日登记（`entryTime` 为今天）的访客总数 |
| `pending` / `confirmed` / `left` / `rejected` / `forcedOut` | 今日登记且**当前**处于对应状态的访客数 |
| `onSite` | 当前所有已确认未离场的访客数（不限登记日期） |
| `badgeOutstanding` | 已发证但未归还的访客证数（`badgeNo` 非空且 `badgeReturned=false`，含强制离场） |

> 注意：`confirmed` 只统计“今天登记且当前已确认”的记录，而 `onSite` 统计全部在访记录，两者数值可能不同。

### 参数校验与错误响应

- 姓名、被访人长度 ≤ 50；联系电话须匹配 `^[0-9+\-() ]{5,30}$`；所属单位 ≤ 100；来访事由 ≤ 200；备注 ≤ 500；陪同员工 ≤ 100。
- 错误响应统一为：

```json
{
  "timestamp": "2026-11-12T10:15:30.123+08:00",
  "status": 400,
  "error": "Bad Request",
  "message": "请求参数校验失败",
  "fieldErrors": { "name": "姓名不能为空" }
}
```

`fieldErrors` 仅在字段级校验失败时出现；`400` 参数不合法、`404` 记录或路径不存在、`405` 请求方法不支持、`409` 状态流转冲突。

### 调用示例

```bash
# 登记
curl -s -X POST http://localhost:8080/api/visitors \
  -H 'Content-Type: application/json' \
  -d '{"name":"张三","phone":"13800138000","organization":"示例公司","hostName":"李四","purpose":"业务洽谈"}'

# 确认进入（生成访客证号）
curl -s -X POST http://localhost:8080/api/visitors/1/confirm \
  -H 'Content-Type: application/json' \
  -d '{"companion":"行政部 王芳"}'

# 离场（须传 badgeReturned）
curl -s -X POST http://localhost:8080/api/visitors/1/checkout \
  -H 'Content-Type: application/json' \
  -d '{"badgeReturned":true}'

# 查询与统计
curl -s 'http://localhost:8080/api/visitors?status=LEFT&date=2026-11-12'
curl -s http://localhost:8080/api/stats/today
```

## 五、前台操作流程

按《公司访客管理制度》执行：

1. **访客登记**：进入 `/register`，填写姓名、联系电话、所属单位、被访人、来访事由、进入时间，提交后记录状态为「待确认」。
2. **联系被访员工确认**：在 `/` 前台看板的「待确认访客」中联系被访员工。
   - 同意进入：点击「确认」，可选填陪同员工，系统生成访客证号（形如 `V20261112-001`），状态变为「已确认」。
   - 不同意进入：点击「拒绝」，可填写原因，状态变为「已拒绝」。
3. **进入与陪同**：已确认访客显示在「当前在访」列表，原则上由公司员工陪同，不得擅自进入无关区域。
4. **离开与归还**：在「当前在访」列表或 `/visitors` 记录页点击「离场」，勾选访客证是否已归还，系统记录离开时间，状态变为「已离场」。
5. **异常处理**：访客存在拍摄、复制传播内部资料等异常行为时，点击「强制离场」并填写原因（必填），状态变为「强制离场」。
6. **查询与追溯**：在 `/visitors` 按状态、进入日期或关键词（姓名 / 电话 / 单位 / 被访人）查询历史记录，点击「详情」查看完整信息。

## 六、常见问题与排障

| 问题 | 处理 |
|---|---|
| 8080 端口被占用 | 用 `lsof -i :8080`（Windows：`netstat -ano \| findstr :8080`）定位进程；或改用 `--server.port=8081` 启动后端，并同步修改 `frontend/vite.config.js` 的代理目标 |
| 5173 端口被占用 | 前端 `strictPort: true`，会直接报错退出。释放端口，或通过 Vite `--port` 临时改端口 |
| 页面提示「无法连接后端服务」 | 后端未启动或端口不一致。先访问 `http://localhost:8080/api/health` 确认后端可用，再核对 Vite 代理目标 |
| 浏览器控制台出现 CORS 错误 | 后端仅放行 `http://localhost:5173` 与 `http://127.0.0.1:5173`。若前端换了端口/域名，需修改 `backend/src/main/java/com/company/visitor/config/WebConfig.java` 并重启后端；通过 Vite 开发代理访问时通常不会触发 CORS |
| 数据库文件位置 | 默认 `backend/data/visitor.db`；用 `VISITOR_DB_PATH` 可指定其他路径。相对路径基于启动目录解析 |
| 数据库备份 | 停止后端后直接复制 `visitor.db` 文件即可（未启用 WAL，无额外日志文件需要同步） |
| 数据库被锁 / `database is locked` | 后端数据源使用单连接池并设置 `PRAGMA busy_timeout = 5000`；避免多个后端进程同时写同一数据库文件 |
| 前端接口 404 | 确认后端已启动且接口前缀为 `/api`；开发时请求应发往前端 5173（由代理转发），不要直连 8080 却带上其他路径 |
| 历史数据表结构变化 | 启动时执行 `schema.sql`（`CREATE TABLE IF NOT EXISTS`），仅首次建表有效；字段变更需手工迁移数据库 |
| 前端构建失败 / 依赖安装慢 | 确认 Node 版本符合要求；必要时删除 `node_modules` 与 `package-lock.json` 后重新 `npm install`，或使用国内镜像源 |

## 七、已知问题与限制

1. **无鉴权与权限控制**：接口与页面没有登录、角色或权限校验，任何能访问 8080/5173 的人都能操作数据。仅适合内网、可信环境试点；正式使用前需补充认证与审计。
2. **无分页与导出**：`GET /api/visitors` 返回全部匹配记录，数据量大时响应会变慢；暂不支持导出报表。
3. **SQLite 单机限制**：数据库为单文件，后端通过单连接池（`maximumPoolSize=1`）串行写入，适合单个前台低并发场景，不适合多实例部署或高并发写入。
4. **访客证号策略**：确认时按「当天日期 + 三位序号」生成 `V<yyyyMMdd>-NNN`，按天从 001 递增且依赖数据库中的最大序号；同一天超过 999 位访客时序号位数会自然增长（不会截断或重置）。
5. **时间不带时区**：`entryTime` / `leaveTime` 等以本地时间字符串存储与返回，不包含时区信息；跨时区或服务器时区变更时需注意。
6. **表结构无迁移机制**：仅靠 `schema.sql` 的 `CREATE TABLE IF NOT EXISTS` 建表；后续字段变更需手工处理。
7. **统计口径**：`stats/today` 中 `pending/confirmed/left/rejected/forcedOut` 只统计今日登记且当前处于该状态的记录；`onSite` 与 `badgeOutstanding` 为全局口径（详见第四节）。
8. **前后端联调状态**：前端（T3）最初使用与契约对齐的 mock API 自测；真实前后端联调由 T4（`tests/visitor-e2e/`）负责，本文编写时 T4 尚在进行中，联调结论以 T4 汇报为准。
9. **本文档的验证范围**：以上启动命令、端口、路径、字段与限制均对照 `backend/`、`frontend/` 实际代码与配置整理；文档编写环境未重新执行启动与构建命令，运行结果引用后端与前端任务的既有汇报。

---

来源：`docs/公司访客管理制度.md`（制度原文）、`backend/` 与 `frontend/` 实际代码/配置（运行与接口说明）。
