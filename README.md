# AI NPC 团队

这是一个在 GitHub Issue 里协作的 AI 团队实验。五个角色拥有独立的 GitHub 身份，通过 Issue 评论接力完成软件任务：

- 项目经理（`npc-pm`）
- OCR（`npc-ocr`）
- Java 开发（`npc-java`）
- React 开发（`npc-react`）
- 测试（`npc-qa`）

每个 Issue 使用一个独立工作分支：`ai-npcs/issue-<编号>`。第一个被触发的 NPC 创建该分支和指向 `main` 的 draft PR；该 Issue 的所有提交都进这个分支；PR 保持 Open，等待人类 review/merge，不自动合并。

## 文档

- [需求文档](docs/requirements.md)
- [实施计划](docs/superpowers/plans/2026-11-11-ai-npc-team.md)
- [设置说明](docs/setup.md)（Claude Code / github.com，兼回滚参考）
- [Copilot CLI 设计方案](docs/superpowers/specs/2026-11-13-copilot-cli-design.md)
- [Copilot CLI 部署手册（bmw.ghe.com）](docs/setup-copilot-cli.md)

## 本地测试

```bash
npm test
```
