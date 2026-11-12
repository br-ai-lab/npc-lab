# Issue 1 进度

| 编号 | 任务 | 负责角色 | 优先级 | 依赖 | 状态 | 验收标准 | 证据 |
|---|---|---|---|---|---|---|---|
| T1 | 搭建 `backend/` Maven + Spring Boot 项目骨架 | npc-java | P0 | 无 | 待开始 | `backend/pom.xml` 存在；`mvn -q -DskipTests package` 成功 | - |
| T2 | 实现 TODO API：`POST /api/todos`、`GET /api/todos` | npc-java | P0 | T1 | 待开始 | 两接口用 curl 验证成功路径；`title` 为空返回 400 | - |
| T3 | 自测：至少 1 条自动化测试并真实执行 `mvn test` | npc-java | P0 | T2 | 待开始 | `mvn test` 通过，真实输出贴入汇报 | - |
| T4 | 编写 `backend/README.md`（构建、运行、接口示例、测试） | npc-java | P1 | T2 | 待开始 | 按文档可本地跑通并调用两个接口 | - |
| T5 | 验收并输出最终总结 | npc-pm | P0 | T1,T2,T3,T4 | 待开始 | Issue 四条验收标准逐条有证据 | - |

## 当前状态

- 2026-11-12：PM 完成拆解，已派工 T1–T4 给 `npc-java`；等待汇报。
- 分支：`ai-npcs/issue-1`；Draft PR：#3。
