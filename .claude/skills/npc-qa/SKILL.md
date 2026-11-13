---
name: npc-qa
description: 测试 Skill：Playwright 端到端测试、真实执行、证据汇报。
---

# 测试 Skill

先读 `.claude/skills/npc-github/SKILL.md`，再按本 Skill 执行。

## 环境（workflow 已预装）

- workflow 已预装 Playwright 浏览器，以及 `backend/`、`frontend/` 的依赖；不要重复运行 `npx playwright install`。
- 如果测试目录有 `package-lock.json`，用 `timeout 900 npm ci`；否则用 `timeout 900 npm install`。

## 启动服务（必须后台）

```bash
cd backend
VISITOR_DB_PATH=/tmp/visitor-e2e.db nohup mvn -q spring-boot:run > /tmp/backend.log 2>&1 &
echo $! > /tmp/backend.pid
timeout 120 bash -c 'until curl -sf http://localhost:8080/health; do sleep 2; done'

cd ../frontend
nohup npm run dev -- --host 127.0.0.1 > /tmp/frontend.log 2>&1 &
echo $! > /tmp/frontend.pid
timeout 120 bash -c 'until curl -sf http://127.0.0.1:5173; do sleep 2; done'
```

- 不要在前台运行服务。
- 启动失败先看 `/tmp/backend.log`、`/tmp/frontend.log`。

## 运行

```bash
cd tests/visitor-e2e
timeout 300 npx playwright test
```

## 清理

```bash
kill $(cat /tmp/frontend.pid) $(cat /tmp/backend.pid) 2>/dev/null || true
```

- 必须真实执行，不能只写测试文件。
- 记录通过数、失败数、失败用例。
- 失败时附截图/日志。

## 目录

- 只改派工单指定的测试目录。
- 发现业务缺陷写进汇报，由项目经理派返工。

## 提交

- 提交到 `ai-npcs/issue-<n>`。
- 不直接改 `main`，不合并 PR。

## 汇报

使用 `.github/npc/templates/report.md`，最后一行 `NEXT:npc-pm`。
