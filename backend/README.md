# 公司访客管理 —— Java 后端

Spring Boot 3.5 + Java 17 + SQLite 实现的访客管理后端，需求依据为
[`docs/visitor-management-policy.md`](../docs/visitor-management-policy.md)（公司访客管理制度）。

## 环境要求

- JDK 17 及以上
- Maven 3.9+

## 启动

```bash
cd backend
mvn spring-boot:run
```

- 端口：`8080`
- 健康检查：`GET http://localhost:8080/health` → `{"status":"UP"}`

## 数据库

- SQLite 文件：`backend/data/visitor.db`（首次启动自动创建目录与表）
- 可用环境变量 `VISITOR_DB_PATH` 覆盖数据库路径，例如：
  `VISITOR_DB_PATH=/tmp/visitor.db mvn spring-boot:run`
- 已启用 WAL 与 5 秒 busy timeout；`data/` 与 `target/` 已加入 `.gitignore`

## 接口

Base URL：`http://localhost:8080`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | 健康检查 |
| POST | `/api/visitors` | 访客登记（201） |
| GET | `/api/visitors?status=&keyword=&date=` | 列表，可按状态、关键字（姓名/所属单位/被访人）、日期过滤 |
| GET | `/api/visitors/{id}` | 访客详情 |
| POST | `/api/visitors/{id}/approve` | 前台确认进入 |
| POST | `/api/visitors/{id}/reject` | 拒绝进入，可选 `{"reason":"..."}` |
| POST | `/api/visitors/{id}/checkout` | 登记离开，可选 `{"badgeReturned":true}` |
| GET | `/api/visitors/stats` | 今日统计 |

### 状态机

```
PENDING ──approve──> APPROVED ──checkout──> LEFT
   └─────reject────> REJECTED
```

非法状态流转返回 `409 Conflict`；访客不存在返回 `404`；参数错误返回 `400`。

### 数据字段

`id, name, phone, company, hostName, purpose, entryTime, status, leaveTime,
badgeReturned, approvedAt, rejectReason, createdAt, updatedAt`

- 时间格式：ISO-8601 本地时间，如 `2026-11-13T09:30:00`
- `status`：`PENDING` / `APPROVED` / `REJECTED` / `LEFT`
- `badgeReturned`：访客证是否归还（布尔，登记离开前为 `null`）

> `rejectReason` 为拒绝原因（制度和派工单要求「拒绝可带 reason」），记录后随响应返回。

### 统计字段

`GET /api/visitors/stats` 返回今日（按 `entryTime` 的日期）计数：

```json
{
  "date": "2026-11-13",
  "total": 2,
  "pending": 0,
  "inVisit": 0,
  "approved": 0,
  "left": 1,
  "rejected": 1
}
```

- `total`：今日登记总数（含已拒绝）
- `pending` / `left` / `rejected`：对应状态数量
- `inVisit` 与 `approved` 含义相同（在访，即 `APPROVED`），同时返回两个键方便前端取用

### 错误格式

```json
{
  "timestamp": "2026-11-13T07:42:23.340Z",
  "status": 400,
  "error": "Bad Request",
  "message": "参数校验失败",
  "fieldErrors": {
    "name": "姓名不能为空",
    "phone": "联系电话不能为空"
  }
}
```

`fieldErrors` 仅在参数校验失败时出现，其余情况为 `null`。

## 示例

```bash
# 登记
curl -X POST http://localhost:8080/api/visitors \
  -H 'Content-Type: application/json' \
  -d '{"name":"张三","phone":"13800138000","company":"某某科技有限公司",
       "hostName":"李四","purpose":"商务洽谈","entryTime":"2026-11-13T09:00:00"}'

# 列表（按状态与关键字）
curl 'http://localhost:8080/api/visitors?status=PENDING&keyword=张三'
curl 'http://localhost:8080/api/visitors?date=2026-11-13'

# 确认进入
curl -X POST http://localhost:8080/api/visitors/1/approve

# 拒绝进入
curl -X POST http://localhost:8080/api/visitors/2/reject \
  -H 'Content-Type: application/json' -d '{"reason":"未预约"}'

# 登记离开（归还访客证）
curl -X POST http://localhost:8080/api/visitors/1/checkout \
  -H 'Content-Type: application/json' -d '{"badgeReturned":true}'

# 今日统计
curl http://localhost:8080/api/visitors/stats
```

## 构建与测试

```bash
cd backend
mvn -DskipTests package   # 仅打包
mvn test                  # 集成测试（MockMvc + 临时 SQLite 文件）
```

## 跨域

允许 `http://localhost:5173` 与 `http://127.0.0.1:5173`（Vite 开发端口）跨域访问，
前端也可通过 Vite proxy 转发 `/api` 与 `/health`。
