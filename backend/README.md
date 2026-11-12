# 访客管理后端（Spring Boot + SQLite）

公司访客管理系统的后端服务，需求来自 `docs/公司访客管理制度.md`，接口契约见
`.npc/issue-10/plan.md`。

## 技术栈

- Java 17+（构建时兼容更高版本 JDK）
- Spring Boot 3.5（Web / Validation / JDBC）
- SQLite（`org.xerial:sqlite-jdbc`），数据文件默认 `data/visitor.db`
- 端口 `8080`，接口前缀 `/api`

## 启动

```bash
cd backend
mvn spring-boot:run
```

启动后数据库文件位于 `backend/data/visitor.db`，首次启动自动建表。

打包运行：

```bash
cd backend
mvn -q package
java -jar target/visitor-management-1.0.0.jar
```

### 配置

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `VISITOR_DB_PATH`（环境变量） | `data/visitor.db` | SQLite 文件路径；相对路径基于启动目录 |
| `server.port` | `8080` | 服务端口（`--server.port=...` 或环境变量覆盖） |

允许跨域来源：`http://localhost:5173`、`http://127.0.0.1:5173`。

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/visitors` | 登记访客，返回 201；必填 `name`、`phone`、`hostName`、`purpose`，`entryTime` 缺省为当前时间，初始状态 `PENDING` |
| GET | `/api/visitors?status=&date=YYYY-MM-DD&keyword=` | 列表，按 `entryTime` 倒序；`keyword` 匹配姓名/电话/单位/被访人 |
| GET | `/api/visitors/{id}` | 详情，不存在返回 404 |
| POST | `/api/visitors/{id}/confirm` | body `{companion?}`；`PENDING → CONFIRMED`，生成 `badgeNo`（如 `V20261112-001`） |
| POST | `/api/visitors/{id}/reject` | body `{reason?}`；`PENDING → REJECTED` |
| POST | `/api/visitors/{id}/checkout` | body `{badgeReturned:boolean}`（必填）；`CONFIRMED → LEFT`，写入 `leaveTime` |
| POST | `/api/visitors/{id}/force-leave` | body `{reason}`（必填）；`CONFIRMED → FORCED_OUT`，写入 `leaveTime` |
| GET | `/api/stats/today` | 今日统计 |
| GET | `/api/health` | `{"status":"ok"}` |

状态机严格校验，非法流转返回 `409`：

```text
PENDING --confirm--> CONFIRMED --checkout--> LEFT
PENDING --reject---> REJECTED
CONFIRMED --force-leave--> FORCED_OUT
```

### 错误响应

```json
{
  "timestamp": "2026-11-12T10:15:30.123+08:00",
  "status": 400,
  "error": "Bad Request",
  "message": "请求参数校验失败",
  "fieldErrors": { "name": "姓名不能为空" }
}
```

无 `fieldErrors` 时该字段省略。`409` 表示状态流转冲突，`404` 表示访客或接口不存在，
`400` 表示参数/请求体不合法。

### 今日统计字段

- `date`：统计日期
- `total/pending/confirmed/left/rejected/forcedOut`：今日登记（`entry_time` 日期为今天）且当前处于对应状态的记录数
- `onSite`：当前所有 `CONFIRMED` 状态的访客数（不限登记日期）
- `badgeOutstanding`：已发放但未归还的访客证数（`badge_no` 非空且 `badge_returned=0`）

## 测试

```bash
cd backend
mvn test
```

集成测试使用 MockMvc + 临时 SQLite 文件（`target/test-db/`），覆盖登记 → 确认 → 离场主流程、
拒绝/强制离场、非法流转 409、参数校验 400、404、列表筛选与今日统计。

## 目录

```text
src/main/java/com/company/visitor/
  controller/    REST 接口
  service/       业务逻辑与状态机
  repository/    JDBC + SQLite
  model/         访客与状态枚举
  dto/           请求/响应对象
  error/         统一异常与错误响应
  config/        数据源与 CORS
src/main/resources/
  application.yml
  schema.sql
```
