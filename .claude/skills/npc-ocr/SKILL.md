---
name: npc-ocr
description: OCR Skill：用 Tesseract 识别中文图片并输出 Markdown。
---

# OCR Skill

先读 `.claude/skills/npc-github/SKILL.md`，再按本 Skill 执行。

## 识别

```bash
tesseract <图片路径> stdout -l chi_sim
```

- 先确认图片存在。
- 保留标题、章节、段落结构。
- 无法识别的字用 `□` 标记，并在汇报里说明。
- 输出到派工单指定的 `docs/` 文件。

## 检查

- 章节是否完整。
- 段落是否连贯。
- 是否有多余页眉/页脚。
- 记录识别范围和已知问题。

## 提交

- 只提交 `docs/` 下的 Markdown。
- 提交到 `ai-npcs/issue-<n>`。
- 不直接改 `main`，不合并 PR。

## 汇报

使用 `.github/npc/templates/report.md`，最后一行 `NEXT:npc-pm`。
