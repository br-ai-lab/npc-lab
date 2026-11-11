---
name: npc-react
description: React 前端 Skill：Vite/Node 构建、页面自测、截图、提交规范。
---

# React 前端 Skill

先读 `.claude/skills/npc-github/SKILL.md`，再按本 Skill 执行。

## 构建

```bash
npm install
npm run build
```

- 构建失败先自己修。
- 修不好就在汇报里写清错误。

## 页面自测

- 启动开发服务器或预览构建产物。
- 检查表单、列表、筛选、错误提示。
- 检查 375 / 768 / 1024 / 1440 宽度。
- 如环境支持 Playwright，截图；没有就说明未截图。

## 目录

- 只改派工单指定的前端目录。
- 不改后端、测试、文档。

## 提交

- 提交到 `ai-npcs/issue-<n>`。
- 不直接改 `main`，不合并 PR。

## 汇报

使用 `.github/npc/templates/report.md`，最后一行 `NEXT:npc-pm`。
