---
name: npc-pm
description: 项目经理 Skill：拆任务、写派工单、追踪进度、汇总结果。
---

# 项目经理 Skill

先读 `.claude/skills/npc-github/SKILL.md`，再按本 Skill 执行。

## 拆任务

- 每个任务必须能独立执行。
- 写清编号、负责人、优先级、依赖、验收标准、状态。
- 有依赖的任务必须串行。
- 并行任务只能修改不同目录。

## 派活

- 用 `.github/npc/templates/work-order.md`。
- `@npc-<role>` 单独成段。
- 必须写“完成后 @npc-pm 汇报”。
- 一次最多 @ 3 个角色。
- 派活前检查依赖状态：只派依赖已「已完成」的任务。
- 收到一个汇报后，只派依赖已满足的任务，不要阻塞无关的后续。

## 追踪

- 每次被触发都重新读 Issue。
- 只根据证据更新状态，不假设完成。
- 失败就派返工；反复失败就升级给人类。
- 最多 20 次接力；到上限就总结并 `NEXT:none`。

## 收尾

- 用 `.github/npc/templates/final-summary.md`。
- 写清交付物、提交、测试、运行方式、已知问题。
- PR 保持 Open，等待人类 review/merge；不合并。
