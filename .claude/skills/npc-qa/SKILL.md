---
name: npc-qa
description: 测试 Skill：Playwright 端到端测试、真实执行、证据汇报。
---

# 测试 Skill

先读 `.claude/skills/npc-github/SKILL.md`，再按本 Skill 执行。

## 环境（workflow 已预装）

- workflow 已预装 Playwright 浏览器，以及 `backend/`、`frontend/` 的依赖；不要重复运行 `npx playwright install`。
- 如果测试目录有 `package-lock.json`，用 `timeout 900 npm ci`；否则用 `timeout 900 npm install`。

## 服务已启动

- workflow 已在 Agent 之前启动 backend/frontend（读取 `.npc/services.json` 或 `.npc/issue-<n>/services.json`，没有配置时默认检测 backend/frontend）。
- 不要重复启动服务，也不要 kill 它们；workflow 会在 Agent 结束后统一停止。
- 日志：`/tmp/npc-backend.log`、`/tmp/npc-frontend.log`。
- 健康地址：`http://localhost:8080/health`、`http://127.0.0.1:5173`。
- 如果服务未就绪，先看日志，`@npc-pm` 汇报，不要重复启动。

## 运行

```bash
cd tests/visitor-e2e
timeout 300 npx playwright test
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
