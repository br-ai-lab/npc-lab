# 公司访客管理前端

React + Vite 实现的公司访客管理电子系统前端，供前台登记访客、确认进入、登记离场与查询记录。

## 启动

```bash
npm install
npm run dev
```

开发服务器默认运行在 <http://localhost:5173>，`/api` 请求会代理到后端 <http://localhost:8080>。

请先启动后端（见 `../backend/README.md`）。

## 构建

```bash
npm run build
npm run preview
```

构建产物输出到 `dist/`（已加入 `.gitignore`）。

## 页面

| 路由 | 页面 | 说明 |
|---|---|---|
| `/` | 前台看板 | 今日统计、待确认访客（确认/拒绝）、当前在访（离场/强制离场） |
| `/register` | 访客登记 | 姓名、电话、单位、被访人、事由、进入时间 |
| `/visitors` | 访客记录 | 状态/日期/关键词筛选、详情弹窗、离场登记 |
| `/policy` | 制度说明 | 《公司访客管理制度》七章内容 |

## 接口

前端只通过 `/api` 调用后端，接口路径与字段严格遵循 `.npc/issue-10/plan.md` 中的契约：

- `POST /api/visitors`、`GET /api/visitors`、`GET /api/visitors/{id}`
- `POST /api/visitors/{id}/confirm|reject|checkout|force-leave`
- `GET /api/stats/today`、`GET /api/health`

网络错误、接口错误与字段校验错误都会在页面上给出中文提示。
