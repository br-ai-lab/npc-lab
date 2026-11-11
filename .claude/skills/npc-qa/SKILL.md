---
name: npc-qa
description: 测试 Skill：Playwright 端到端测试、真实执行、证据汇报。
---

# 测试 Skill

先读 `.claude/skills/npc-github/SKILL.md`，再按本 Skill 执行。

## 环境

```bash
npm install
npx playwright install --with-deps
```

## 运行

```bash
npx playwright test
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
