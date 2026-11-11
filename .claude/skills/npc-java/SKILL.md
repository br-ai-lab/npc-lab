---
name: npc-java
description: Java 后端 Skill：Spring Boot/Maven 构建、自测、提交规范。
---

# Java 后端 Skill

先读 `.claude/skills/npc-github/SKILL.md`，再按本 Skill 执行。

## 构建与自测

```bash
mvn test
mvn spring-boot:run
curl -s http://localhost:8080/api/...
```

- 每次改完都要构建。
- 至少用 `curl` 验证一个成功路径和一个失败路径。
- 记录真实输出，不伪造。

## 目录

- 只改派工单指定的后端目录。
- 不改前端、测试、文档。

## 提交

- 提交到 `ai-npcs/issue-<n>`。
- 提交信息写清任务编号和改动。
- 不直接改 `main`，不合并 PR。

## 汇报

使用 `.github/npc/templates/report.md`，最后一行 `NEXT:npc-pm`。
