# Issue 1 进度

| 编号 | 任务 | 负责角色 | 优先级 | 依赖 | 状态 | 验收标准 | 证据 |
|---|---|---|---|---|---|---|---|
| T1 | 搭建 `backend/` Maven + Spring Boot 项目骨架 | npc-java | P0 | 无 | 已完成 | `backend/pom.xml` 存在；`mvn -q -DskipTests package` 成功 | npc-java 汇报 BUILD SUCCESS；PM 复核 `backend/pom.xml` |
| T2 | 实现 TODO API：`POST /api/todos`、`GET /api/todos` | npc-java | P0 | T1 | 已完成 | 两接口用 curl 验证成功路径；`title` 为空返回 400 | npc-java 汇报 curl 201/200/400；PM 复核 `TodoController.java` |
| T3 | 自测：至少 1 条自动化测试并真实执行 `mvn test` | npc-java | P0 | T2 | 已完成 | `mvn test` 通过，真实输出贴入汇报 | npc-java 汇报 Tests run 4, Failures 0；PM 复核 `TodoApiTest.java` |
| T4 | 编写 `backend/README.md`（构建、运行、接口示例、测试） | npc-java | P1 | T2 | 已完成 | 按文档可本地跑通并调用两个接口 | PM 复核 README 章节完整 |
| T5 | 验收并输出最终总结 | npc-pm | P0 | T1,T2,T3,T4 | 已完成 | Issue 四条验收标准逐条有证据 | 见 Issue #1 验收评论 |

## 当前状态

- 2026-11-12：PM 完成拆解，已派工 T1–T4 给 `npc-java`。
- 2026-11-12：`npc-java` 汇报 T1–T4 完成（提交 `6291ab8`），附构建、`mvn test`（4/4）和 curl 证据。
- 2026-11-12：PM 完成 T5 验收：复核源码、测试与 README；Issue 四条验收标准逐条有证据。
- 分支：`ai-npcs/issue-1`；Draft PR：#3（保持 Open，等待人类 review/merge）。
- 遗留：进程内存存储，重启数据清空（Stage 1 约定，非缺陷）。
