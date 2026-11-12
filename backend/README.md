# TODO API (Stage 1)

最小可运行的 TODO 服务：新增与列表两个接口，内存存储，不接数据库。

## 技术栈

- Java 25（Temurin）
- Maven 3.9+
- Spring Boot 3.5.16

## 构建

```bash
cd backend
mvn -q -DskipTests package
```

## 运行

```bash
cd backend
mvn spring-boot:run
```

服务默认监听 `http://localhost:8080`。

也可以先打包再运行：

```bash
java -jar target/todo-api-0.0.1-SNAPSHOT.jar
```

## 接口

### 创建 TODO

```bash
curl -i -X POST http://localhost:8080/api/todos \
  -H 'Content-Type: application/json' \
  -d '{"title":"买牛奶"}'
```

成功返回 `201 Created`：

```json
{"id":1,"title":"买牛奶","done":false,"createdAt":"2026-11-12T07:00:00Z"}
```

`title` 缺失或为空白时返回 `400 Bad Request`：

```bash
curl -i -X POST http://localhost:8080/api/todos \
  -H 'Content-Type: application/json' \
  -d '{"title":"   "}'
```

```json
{"error":"title must not be blank"}
```

### 列出 TODO

```bash
curl -s http://localhost:8080/api/todos
```

返回 `200 OK` 和按创建顺序排列的数组：

```json
[{"id":1,"title":"买牛奶","done":false,"createdAt":"2026-11-12T07:00:00Z"}]
```

## 测试

```bash
cd backend
mvn test
```

测试使用 MockMvc，覆盖：

- 创建成功返回 201、`Location` 头与完整字段；
- 列表按创建顺序返回；
- `title` 为空白或缺失返回 400。

## 说明

- 存储为进程内内存，重启后数据清空（Stage 1 约定）。
- 数据访问方法已加锁，避免并发写入破坏列表。
