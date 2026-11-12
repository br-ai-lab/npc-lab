# Issue 1 计划：Stage 1 — TODO API

## 目标

在 `backend/` 下交付一个最小可运行的 Java TODO 服务：新增与列表两个接口、一条真实执行的自测、一份 README。所有提交进入 `ai-npcs/issue-1`，不直接改 `main`。

## 任务表

| 编号 | 任务 | 负责角色 | 优先级 | 依赖 | 状态 | 验收标准 | 证据 |
|---|---|---|---|---|---|---|---|
| T1 | 搭建 `backend/` Maven + Spring Boot 项目骨架 | npc-java | P0 | 无 | 待开始 | `backend/pom.xml` 存在；`mvn -q -DskipTests package` 成功 | - |
| T2 | 实现 TODO API：`POST /api/todos`、`GET /api/todos` | npc-java | P0 | T1 | 待开始 | 两接口用 curl 验证成功路径；`title` 为空返回 400 | - |
| T3 | 自测：至少 1 条自动化测试并真实执行 `mvn test` | npc-java | P0 | T2 | 待开始 | `mvn test` 通过，真实输出贴入汇报 | - |
| T4 | 编写 `backend/README.md`（构建、运行、接口示例、测试） | npc-java | P1 | T2 | 待开始 | 按文档可本地跑通并调用两个接口 | - |
| T5 | 验收并输出最终总结 | npc-pm | P0 | T1,T2,T3,T4 | 待开始 | Issue 四条验收标准逐条有证据 | - |

## 接口约定（Stage 1）

- `POST /api/todos`
  - 请求体：`{"title":"买牛奶"}`
  - 成功：`201 Created`，返回 `{"id":1,"title":"买牛奶","done":false,"createdAt":"..."}`
  - `title` 缺失或空白：`400 Bad Request`
- `GET /api/todos`
  - 成功：`200 OK`，返回 TODO 数组（按创建顺序）
- 存储：Stage 1 使用内存存储即可，不引入数据库。
- 运行端口：`8080`。

## 约束

- Stage 1 仅启用 `npc-pm` 与 `npc-java`；前端、OCR、QA 角色暂不参与接力。
- Java 版本以 workflow 为准：Temurin 25；Spring Boot 使用与之兼容的 3.x 版本。
- 业务代码只能由 `npc-java` 写入 `backend/`；`npc-pm` 只维护 `.npc/issue-1/` 下的计划与状态。
- 不合并 PR；PR #3 保持 Open，等待人类 review/merge。
