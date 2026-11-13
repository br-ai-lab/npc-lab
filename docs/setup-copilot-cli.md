# 在 bmw.ghe.com 上用 GitHub Copilot CLI 部署 NPC 团队

> 这是一份**从零开始的完整构建手册**。你不需要再跳去看 `docs/setup.md`。
> 目标环境：`https://bmw.ghe.com`（GitHub Enterprise Cloud + data residency）。
> AI 引擎：GitHub Copilot CLI，认证用 `COPILOT_GITHUB_TOKEN`。
> 设计说明：`docs/superpowers/specs/2026-11-13-copilot-cli-design.md`。
> 旧文档 `docs/setup.md` 是 Claude Code / github.com 的原始说明，只在回滚时参考。

> 下文用 `<组织>` 代指 npc-lab 所在的 GHE.com 组织/企业，用 `npc-lab` 代指仓库名。
> 如果你的仓库叫别的名字，把 `npc-lab` 换成实际名字即可。

---

## 目录

1. 先看懂你要做什么
2. 准备清单
3. 创建仓库
4. 确认 Copilot CLI 可用
5. 创建 `COPILOT_GITHUB_TOKEN`
6. 添加 Secrets
7. 设置 Repository variables
8. 创建 GitHub Apps
9. 创建 `npc-work-mode` 标签
10. 推送代码
11. 保护 `main`
12. 验证仓库配置
13. 第一次冒烟测试
14. Stage 1 验收
15. Stage 2：三个新角色
16. 验证清单
17. 常见错误排查
18. 预算与成本
19. 回滚到 Claude Code
20. 安全注意事项
21. 命令速查
22. 文件清单
23. 与旧文档 `docs/setup.md` 的关系
24. 你还需要知道的边界

---

## 1. 先看懂你要做什么

npc-lab 是一支“住在 Issue 里的 AI 团队”：

1. 人类在 Issue 里加 `npc-work-mode` 标签，并评论 `@npc-pm 请开始`。
2. GitHub Actions 启动 `npc-pm` 的 workflow。
3. workflow 用 `npc-pm` 这个 GitHub App 的身份（不是你的个人身份）去评论、建分支、开 draft PR。
4. workflow 里的 **Copilot CLI** 读 Issue、拆任务、派活给 `npc-java`。
5. `npc-java` 再启动一个 workflow，改代码、提交、评论，最后 `NEXT:npc-pm`。
6. 人类 review 并合并 draft PR。

这次改造只换“AI 引擎”：

```text
以前：Claude Code CLI + ANTHROPIC_* / CLAUDE_CODE_OAUTH_TOKEN
现在：GitHub Copilot CLI + COPILOT_GITHUB_TOKEN + GH_HOST=bmw.ghe.com
```

npc-lab 的分支规则、App 身份、`NEXT:` 接力、gate、人工合并都不变。

### 架构图

```text
人类评论 @npc-pm + npc-work-mode 标签
        │
        ▼
npc-dispatch.yml（人类评论统一入口）
        │ repository_dispatch
        ▼
npc-<role>.yml
        │
        ├─ actions/create-github-app-token → GH_TOKEN（角色身份）
        ├─ checkout Issue 分支
        ├─ 安装 @github/copilot
        ├─ gate.mjs（标签/作者/mention）
        ├─ ensure-branch-pr.mjs（PM 首次）
        └─ .github/actions/npc-agent
                │
                ├─ 生成 ~/.copilot/agents/npc-<role>.agent.md
                ├─ copilot -p <issue prompt> --agent npc-<role> ...
                ├─ 解析回复 + premium requests
                ├─ 写 handoff.json
                └─ parseNext → repository_dispatch
```

### 术语表

| 术语 | 含义 |
|---|---|
| **Secret** | 加密保存的敏感值，保存后不能回读；日志会自动打码 |
| **Variable** | 明文配置值，适合模型名、主机名、预算等非敏感信息 |
| **GitHub App** | 代表一个 NPC 的独立机器人身份；评论会显示 `npc-pm[bot]` |
| **installation token** | GitHub App 安装到仓库后换来的短期 token，用于 `gh`/`git` |
| **fine-grained PAT** | 细粒度个人访问令牌；本手册用它做 Copilot 认证 |
| **`COPILOT_GITHUB_TOKEN`** | Copilot CLI 读取的 token 环境变量 |
| **`GH_HOST`** | GHE.com 主机名，例如 `bmw.ghe.com`；不要带 `https://` |
| **premium request** | Copilot 的计费单位；一次 prompt 通常消耗 1 个 × 模型倍率 |
| **`ai-npcs/issue-<n>`** | 每个 Issue 唯一的工作分支 |

---

## 2. 准备清单

在开始之前，请确认：

- [ ] 你能登录 `https://bmw.ghe.com`，并且是目标仓库的 **Owner / Admin**。
- [ ] 目标仓库在 bmw.ghe.com 上（可以新建，也可以直接用现有仓库）。
- [ ] 企业/组织有 **Copilot 付费计划**（Business / Enterprise，或个人 Pro/Pro+）。
- [ ] 企业/组织策略允许 **Copilot CLI**。
- [ ] 你能创建一个 fine-grained PAT，并勾选 **Copilot Requests** 权限。
- [ ] 你有一个专门跑 CI 的账号（推荐），或者你接受用自己的账号 token。
- [ ] 仓库已经启用 GitHub Actions。
- [ ] 仓库的 workflow 使用 `runs-on: ubuntu-latest`（GHE.com 支持 GitHub 托管的 Linux runner）。
- [ ] 本地有 Node 22+（只用于跑本地测试；Actions 里也会装 Node 22）。

> 为什么推荐专用账号：token 绑定账号；人离职、改密码、撤销授权都会让 CI 失效。专用服务账号更容易轮换和审计。

### 2.1 GHE.com 和 github.com 的差异

| 项目 | github.com | bmw.ghe.com |
|---|---|---|
| 仓库可见性 | Public / Private | **Public 不可用**；用 Private（或企业允许的 Internal） |
| Copilot 推理端点 | `api.githubcopilot.com` 等 | `copilot-api.bmw.ghe.com` |
| 认证主机 | 默认 github.com | 必须设 `GH_HOST=bmw.ghe.com` |
| Marketplace | 可用 | 不可用；GitHub App 手工创建，公开 `actions/*` 仍可解析 |
| App 创建入口 | 个人/组织 Settings | 组织/企业 Settings；EMU 下可能只有企业管理员能建 |

> GHE.com 使用 Enterprise Managed Users（EMU），个人账号能做的事情比 github.com 少；找不到入口时找企业管理员。

---

## 3. 创建仓库

1. 打开 `https://bmw.ghe.com`，进入 `<组织>`。
2. 新建一个仓库，名称建议 `npc-lab`。
3. **不要**初始化 README、`.gitignore` 或 License（本地已经有文件）。
4. 可见性选 **Private**（GHE.com 不支持 Public；企业允许的话可以选 Internal）。
5. 创建后先不要 push；等下面的 Secret、Variable、App 配完再推。
6. 确认 **Settings → Actions → General** 里 Actions 是启用的。

> 如果企业的 Actions 托管 runner 被限制，需要让管理员开放，或改用 self-hosted runner；本手册默认使用 `ubuntu-latest`。

---

## 4. 确认 Copilot CLI 可用

### 4.1 确认企业/组织策略

组织管理员：

1. 打开 `https://bmw.ghe.com/organizations/<你的组织>/settings/copilot`
2. 找到 **Policies**（策略）
3. 确认 **Copilot CLI** 已启用
4. 如果有 **“Allow use of Copilot CLI billed to the organization”**，按企业规定决定是否开启

企业管理员：

1. 打开企业设置里的 **Copilot → Policies**
2. 确认 Copilot CLI 没有被禁用
3. 如果企业策略把 CLI 关掉了，组织层也无法开启；需要企业管理员处理

> 如果看不到 Copilot 设置，说明你的账号不是管理员，或者企业没有给你们开 Copilot。先找管理员。

### 4.2 确认你有 Copilot 许可

1. 打开 `https://bmw.ghe.com/settings/copilot`
2. 确认你的账号显示 Copilot 已启用
3. 如果显示“无许可”，找组织管理员分配一个 Copilot 席位

> Copilot Free 不包含 CLI；需要付费计划。

---

## 5. 创建 `COPILOT_GITHUB_TOKEN`

推荐用 **fine-grained PAT**，只给它 Copilot Requests 权限。

### 5.1 打开创建页面

在 bmw.ghe.com 上打开：

```text
https://bmw.ghe.com/settings/personal-access-tokens/new
```

> 注意：一定要在 **bmw.ghe.com** 上创建。github.com 上创建的 token 不能用于 bmw.ghe.com。

### 5.2 填写

| 字段 | 建议值 |
|---|---|
| Token name | `npc-lab-copilot-cli` |
| Expiration | 90 天（到期前轮换） |
| Resource owner | 你自己，或专用服务账号 |
| Repository access | 只选 npc-lab 仓库（最小权限） |
| Permissions | 只勾选 **Copilot Requests**（Read 即可；如果只有 Write 选项就选 Write） |

其他权限全部不勾。

### 5.3 生成并保存

1. 点击 **Generate token**
2. 复制以 `github_pat_` 开头的 token
3. **只显示一次**，立刻保存到密码管理器
4. 不要粘贴到 Issue、代码、聊天或日志里

> 如果页面没有 **Copilot Requests** 权限：
> - 确认你所在的组织/企业有 Copilot 计划；
> - 确认你的账号有 Copilot 许可；
> - 有些企业只允许 GitHub App 认证，这时改用第 5.4 节。

### 5.4 备选：GitHub App installation token

如果企业不允许个人 PAT：

1. 在 bmw.ghe.com 创建一个 GitHub App（企业/组织管理员操作）
2. 权限里勾选 **Copilot Requests**（Read & write）
3. 安装到 npc-lab 仓库，选择 **All repositories** 或只选 npc-lab
4. 用 App ID + private key 换 installation token；把它作为 `COPILOT_GITHUB_TOKEN`
5. 注意 installation token 1 小时过期，需要在 workflow 里动态生成

> 这条路径更企业化，但配置更复杂。先用 PAT 跑通，再考虑切换。
> 如果你们企业的 Copilot 走组织计费，也可以评估 Actions 的 `copilot-requests: write` 权限；但本手册固定使用 `COPILOT_GITHUB_TOKEN`，因为它在 GHE.com 上更可控。

### 5.5 验证 token（可选）

在本地终端：

```bash
export COPILOT_GITHUB_TOKEN="github_pat_xxx"
export GH_HOST="bmw.ghe.com"

copilot -p "只回复 OK" --no-ask-user
```

预期：输出 `OK`，不报 401/403。

> 如果本地没装 Copilot CLI：`npm install -g @github/copilot`（需要 Node 22+）。
> 如果本机不能访问 bmw.ghe.com，跳过这一步，直接在 Actions 里验证。

---

## 6. 添加 Secrets

打开仓库 → **Settings → Secrets and variables → Actions → Secrets → New repository secret**。

### 6.1 Stage 1 必须的 Secret

| Secret 名称 | 值 |
|---|---|
| `COPILOT_GITHUB_TOKEN` | 第 5 步创建的 token |
| `NPC_PM_APP_ID` | `npc-pm` 的 App ID |
| `NPC_PM_PRIVATE_KEY` | `npc-pm` 的 `.pem` 文件全文 |
| `NPC_JAVA_APP_ID` | `npc-java` 的 App ID |
| `NPC_JAVA_PRIVATE_KEY` | `npc-java` 的 `.pem` 文件全文 |

### 6.2 Stage 2 再补的 Secret

| Secret 名称 | 值 |
|---|---|
| `NPC_OCR_APP_ID` / `NPC_OCR_PRIVATE_KEY` | `npc-ocr` 的 App ID / `.pem` |
| `NPC_REACT_APP_ID` / `NPC_REACT_PRIVATE_KEY` | `npc-react` 的 App ID / `.pem` |
| `NPC_QA_APP_ID` / `NPC_QA_PRIVATE_KEY` | `npc-qa` 的 App ID / `.pem` |

### 6.3 组织级 Secret（可选）

如果多个仓库复用同一套 NPC：

1. 打开 `https://bmw.ghe.com/organizations/<组织>/settings/secrets/actions`
2. **New organization secret**
3. 选择允许访问的仓库（建议只选 npc-lab）

> Secret 保存后不能回读；填错只能重新创建。
> `.pem` 是文本文件；用 VS Code/记事本打开，全选复制。内容必须包含
> `-----BEGIN RSA PRIVATE KEY-----` 和 `-----END RSA PRIVATE KEY-----`。

---

## 7. 设置 Repository variables

这些不是密钥，放在 **Variables** 里。

打开仓库 → **Settings → Secrets and variables → Actions → Variables → New repository variable**，添加：

| Name | Value | 说明 |
|---|---|---|
| `NPC_RUNTIME` | `copilot` | 让 workflow 走 Copilot CLI |
| `NPC_GITHUB_HOST` | `bmw.ghe.com` | GHE.com 主机名；不要带 `https://` |
| `COPILOT_MODEL` | 例如 `claude-sonnet-4.5` | 企业允许的模型；不确定就先不填，用默认 |
| `COPILOT_BUDGET_PREMIUM_REQUESTS` | `250` | 单次运行上限；约等于 $10 |
| `COPILOT_OUTPUT_FORMAT` | `text` | 先用 `text`；确认 CLI 支持后再改 `json` |

> `NPC_RUNTIME` 不设置时默认是 `claude`。如果你只是想在 bmw.ghe.com 试点，保留 Claude 作为回退，把 `NPC_RUNTIME` 设为 `copilot` 即可。
> 这些变量在 workflow 里通过 `vars.NPC_RUNTIME` 等读取；不要把它们误填到 Secrets 里。

---

## 8. 创建 GitHub Apps

npc-lab 需要 5 个独立身份。Stage 1 先建 2 个，Stage 2 再建 3 个。

| App 名称 | 角色 | Secret |
|---|---|---|
| `npc-pm` | 项目经理 | `NPC_PM_APP_ID` / `NPC_PM_PRIVATE_KEY` |
| `npc-java` | Java 开发 | `NPC_JAVA_APP_ID` / `NPC_JAVA_PRIVATE_KEY` |
| `npc-ocr` | OCR / 文档 | `NPC_OCR_APP_ID` / `NPC_OCR_PRIVATE_KEY` |
| `npc-react` | React 前端 | `NPC_REACT_APP_ID` / `NPC_REACT_PRIVATE_KEY` |
| `npc-qa` | 测试 | `NPC_QA_APP_ID` / `NPC_QA_PRIVATE_KEY` |

### 8.1 先弄清 App 的“URL”

旧文档 `docs/setup.md` 里所有 `github.com` 地址，在 bmw.ghe.com 上都要换成对应地址：

| github.com 地址 | bmw.ghe.com 地址 |
|---|---|
| `https://github.com/settings/apps` | `https://bmw.ghe.com/settings/apps` |
| `https://github.com/organizations/br-ai-lab/settings/apps` | `https://bmw.ghe.com/organizations/<你的组织>/settings/apps` |
| `https://github.com/settings/apps/npc-pm` | `https://bmw.ghe.com/settings/apps/npc-pm` |
| `https://github.com/organizations/br-ai-lab/settings/apps/npc-pm` | `https://bmw.ghe.com/organizations/<你的组织>/settings/apps/npc-pm` |
| Homepage URL 里的 `https://github.com/br-ai-lab/npc-lab` | `https://bmw.ghe.com/<你的组织>/npc-lab` |

> EMU 环境下，个人 `/settings/apps` 可能不存在；这时用组织/企业设置里的 GitHub Apps 入口，或找管理员。

### 8.2 每个 App 的创建步骤

对 `npc-pm`、`npc-java` 重复下面的步骤（Stage 2 再对另外三个重复）：

1. 打开 **Settings → Developer settings → GitHub Apps → New GitHub App**。
   - 组织：`https://bmw.ghe.com/organizations/<组织>/settings/apps`
   - 个人（如果可用）：`https://bmw.ghe.com/settings/apps`
2. 填写：
   - **GitHub App name**：必须完全一致，例如 `npc-pm`。
     - NPC 的身份由 **App 名称/slug** 决定，不是 Homepage URL。
     - 两个 App 可以填同一个 Homepage URL；它只是介绍页。
   - **Homepage URL**：`https://bmw.ghe.com/<组织>/npc-lab`
   - **Webhook**：取消勾选 **Active**。
3. **Repository permissions**：
   - **Contents**：Read and write
   - **Issues**：Read and write
   - **Pull requests**：Read and write
   - **Metadata**：Read-only（默认）
4. 其他权限保持默认，不要给 Administration 权限。
5. 点击 **Create GitHub App**。
6. 在 App 设置页的 **About** 区域找到 **App ID**（一串数字），记下来。
   - 关掉页面后可以这样找回：
     - 个人：`https://bmw.ghe.com/settings/apps` → 点对应 App
     - 组织：`https://bmw.ghe.com/organizations/<组织>/settings/apps` → 点对应 App
7. 左侧 **Credentials → Key pairs → New key**。
   - 浏览器会下载一个 `.pem` 文件，例如 `npc-pm.2026-11-13.private-key.pem`。
   - GitHub 不会再次显示这个私钥；丢了只能重新生成，并更新 Secret。
   - 不要把 `.pem` 提交到仓库，也不要发到聊天里。
8. 左侧 **Install App** → 选择 **Only select repositories** → `npc-lab` → **Install**。
   - Install 页面列出的是“可以安装到的账号/组织”，不是 App 名称。
   - 看到 `<组织>` 是对的：把 App 安装到该组织下的 `npc-lab` 仓库。
9. 把 App ID 和 `.pem` 全文分别存成第 6 节的 Secret。

> 2026 年的 GitHub UI 把私钥放在 **Credentials → Key pairs → New key**。旧界面可能在页面底部 **Private keys → Generate a private key**，两者是同一个东西。
> `.pem` 必须包含 `-----BEGIN RSA PRIVATE KEY-----` 和 `-----END RSA PRIVATE KEY-----`，否则 App token 创建会失败。

### 8.3 常见错误

| 错误 | 后果 | 处理 |
|---|---|---|
| App 名称不是 `npc-pm` | git 提交身份、评论显示错 | 删除重建，名称必须完全一致 |
| 没有安装到 `npc-lab` | App 无法读写仓库 | Install App → 选择仓库 |
| `.pem` 粘贴不完整 | App token 创建失败 | 确认包含 BEGIN/END 两行 |
| 给了 Administration 权限 | 权限过大 | 只保留 Contents/Issues/PR/Metadata |
| Webhook 仍 Active | 可能产生无效请求 | 取消勾选 Active |

---

## 9. 创建 `npc-work-mode` 标签

1. 打开仓库 → **Issues → Labels → New label**。
2. 名称：`npc-work-mode`
3. 颜色：红色或橙色（例如 `#D93F0B`）
4. 描述：允许 AI 团队写入代码；只有 Owner/Member/Collaborator 可以添加。
5. 保存。

> 没有这个标签，NPC 只会评论，不会写代码。gate 会检查它。

---

## 10. 推送代码

在本地 npc-lab 目录：

```bash
git remote add bmw https://bmw.ghe.com/<组织>/npc-lab.git
git push -u bmw main
```

如果你不想直接推 `main`，可以先推一个分支，再在网页开 PR 合并。

推完后确认仓库里能看到：

```text
.github/workflows/npc-pm.yml
.github/workflows/npc-java.yml
.github/workflows/npc-ocr.yml
.github/workflows/npc-react.yml
.github/workflows/npc-qa.yml
.github/workflows/npc-dispatch.yml
.github/actions/npc-agent/action.yml
.github/npc/roles/*.md
.github/npc/templates/*.md
.claude/skills/*/SKILL.md
scripts/
tests/
docs/
```

> 不要提交 `.pem`、token、`.env`、`node_modules`。

---

## 11. 保护 `main`

GitHub 现在推荐用 **Rulesets**（**Settings → Rules → Rulesets**）；旧的 **Branches** 页面也能用。两种方式都按下面的标准配置。

### 11.1 规则目标

- Target branches：包含 `main`（或 `~DEFAULT_BRANCH`）
- Enforcement：**Active**（不是 Evaluate / Disabled）

> 如果页面显示 **“Applies to 0 targets”**，说明规则没有匹配任何分支，等于没开。必须点 **Add target** → **Include default branch**，或 **Include by pattern** 填 `main`。

### 11.2 必须开启

- **Require a pull request before merging**：ON
  - **Required approvals**：**0**（自己实验时，填 1 会导致你无法批准自己的 PR）
  - **Dismiss stale pull request approvals**：OFF
  - **Require review from Code Owners**：OFF
  - **Require approval of the most recent reviewable push**：OFF
- **Block force pushes**：ON
- **Restrict deletions**：ON

### 11.3 建议关闭

- **Restrict creations / Restrict updates**：OFF。开了且 Bypass list 为空时，可能连 PR 合并都被挡住；`Require a pull request` 已经够用。
- **Require status checks to pass**：OFF（目前没有配置 status checks；开了会挡住 PR）
- **Require signed commits**：OFF（NPC 用 App 身份提交，可能不是签名提交）
- **Require linear history**：可选
- **Require merge queue**：OFF
- **Require deployments**：OFF
- **Require code scanning / code quality / code coverage**：OFF
- **Require an additional approval for unattributed Copilot pull requests**：OFF
- **Automatically request Copilot code review**：OFF

### 11.4 Bypass list

- 不要加入 `npc-pm` / `npc-java` / 其他 NPC；否则 NPC 可以绕过规则直接推 `main`。
- 如果只加入你自己（admin）用于紧急情况，可以接受，但技术强制会弱一点。

### 11.5 仓库设置

- **Settings → General → Pull Requests → Allow auto-merge**：**OFF**
- 不要开启自动合并。

这样 NPC 只能把提交推到 `ai-npcs/issue-<n>`，最终由人类合并 PR。

> 如果 GHE.com 的 Rulesets 不可用，改用 **Branches** 页面按同样的选项配置。

---

## 12. 验证仓库配置

在本地 npc-lab 目录（Node 22+）：

```bash
npm test
node scripts/verify-config.mjs
```

预期：

- 测试全部通过（当前是 77 个测试）；
- 输出 `config ok`。

> `npm test` 只跑本地单元测试，不调用 Copilot；不需要 token。
> 如果 `verify-config.mjs` 报错，按提示修 workflow/action 后再推。

---

## 13. 第一次冒烟测试

### 13.1 创建测试 Issue

在 npc-lab 仓库新建 Issue：

````text
## 目标
只做一件事：在 docs/smoke.md 里写一行 “copilot cli smoke test”。

## 验收标准
1. 创建 docs/smoke.md；
2. 提交到 ai-npcs/issue-<n>；
3. 不直接改 main。

@npc-pm 请开始。
````

### 13.2 启动

1. 给 Issue 加 `npc-work-mode` 标签。
2. 发评论：`@npc-pm 请开始`。

### 13.3 观察 Actions

1. 打开仓库 **Actions**。
2. 找到 `NPC PM` workflow。
3. 点进最近的 run。
4. 看日志，确认：

```text
Install Copilot CLI
  npm install -g @github/copilot  ✅
Run NPC agent
  NPC_RUNTIME=copilot
  GH_HOST=bmw.ghe.com
  COPILOT_GITHUB_TOKEN 已设置（不要打印值）
```

5. 如果失败，先看第 17 节。

### 13.4 预期结果

- Issue 出现 `npc-pm[bot]` 的评论；
- 分支 `ai-npcs/issue-<n>` 创建；
- draft PR 创建；
- 评论最后一行是 `NEXT:npc-java`；
- `npc-java` workflow 被触发；
- 最终 PR 保持 open，不自动合并。

---

## 14. Stage 1 验收

冒烟通过后，跑一个真实的小任务。

### 14.1 创建 Stage 1 Issue

标题：`Stage 1: TODO API`

````text
## 目标
做一个最小的 TODO 接口：新增和列表两个接口，附一条自测。

## 交付物
backend/ 下的 Java 项目、README、一条自测。

## 验收标准
1. 两个接口可用；
2. 自测真实执行；
3. 代码提交到 ai-npcs/issue-<n>；
4. 不直接改 main。

@npc-pm 请拆解并分配给 Java 开发。
````

加 `npc-work-mode` 标签。

### 14.2 运行

发评论 `@npc-pm 请开始`，观察：

- 项目经理评论显示为 `npc-pm[bot]`；
- 分支 `ai-npcs/issue-<n>` 和 draft PR 已创建；
- 项目经理 @`npc-java` 派活；
- Java 评论显示为 `npc-java[bot]`；
- Java 提交并 push；
- 项目经理总结；
- PR 保持 Open。

### 14.3 检查不变量

```bash
export GH_HOST=bmw.ghe.com
gh issue view <n> --comments
gh pr list --head ai-npcs/issue-<n> --state open
gh pr view <pr> --json isDraft,state,merged
git ls-remote --heads origin ai-npcs/issue-<n>
```

预期：

- 一个 open draft PR，未合并；
- 一个分支；
- 两个 bot 的评论；
- `main` 上没有直接提交。

### 14.4 语言跟随测试

再建一个英文 Issue，写一个小任务，评论 `@npc-pm`。

预期：所有角色评论用英文；代码/标识符用英文。
如果第一次是英文，再补一次中文测试。

### 14.5 记录结果

把日期、Issue/PR 链接、检查结果写进 `docs/stage1-acceptance.md`，提交到 `main`（这一步由人类做，不走 NPC）。

---

## 15. Stage 2：三个新角色

Stage 1 通过后，再补 OCR、React、QA。

### 15.1 创建三个 App

对 `npc-ocr`、`npc-react`、`npc-qa` 重复第 8 节的步骤：

- App 名称必须完全一致；
- 权限同样是 Contents rw、Issues rw、Pull requests rw、Metadata r；
- 安装到 `npc-lab`；
- 生成 private key，填到对应 Secret。

### 15.2 准备访客制度图片

把《公司访客管理制度》图片放到：

```text
assets/公司访客管理制度.png
```

提交到 `main`（或通过网页上传）。

### 15.3 创建 Stage 2 Issue

按 `docs/requirements.md` §8.1 的请求，包含：

- 图片路径；
- 前后端目录；
- SQLite；
- Java + React；
- 验收标准。

加 `npc-work-mode` 标签，评论 `@npc-pm`。

### 15.4 预期链路

```text
PM → OCR → Java → React → QA → PM
```

检查：

- 每条评论都是正确的 bot 身份；
- 所有提交都在 `ai-npcs/issue-<n>`；
- 一个 open draft PR，未合并；
- `docs/公司访客管理制度.md` 存在；
- 后端和前端能运行；
- 测试通过并有证据；
- 项目经理总结包含运行说明；
- 没有直接推 `main`。

### 15.5 记录结果

把链接、提交列表、测试输出、截图、已知缺口写进 `docs/stage2-acceptance.md`。

---

## 16. 验证清单

先在本地登录 bmw.ghe.com（只需一次）：

```bash
export GH_HOST=bmw.ghe.com
gh auth login --hostname bmw.ghe.com
```

然后：

```bash
# 评论
gh issue view <n> --comments

# 分支
git ls-remote --heads origin ai-npcs/issue-<n>

# PR
gh pr list --head ai-npcs/issue-<n> --state open
gh pr view <pr> --json isDraft,state,merged,commits,files

# 本地测试
npm test
node scripts/verify-config.mjs

# 运行产物
# Actions → 对应 run → Artifacts → npc-timing-<run_id>
```

`npc-timing.json` 里应包含：

```json
{
  "runtime": "copilot",
  "wallClockMs": 123456,
  "model": "claude-sonnet-4.5",
  "premiumRequests": 3,
  "budgetPremiumRequests": 250
}
```

如果 `premiumRequests` 是 `null`，说明输出里没解析到用量；先继续跑，后续再补统计。

---

## 17. 常见错误排查

| 现象 | 原因 | 处理 |
|---|---|---|
| `missing auth: set COPILOT_GITHUB_TOKEN` | Secret 没配或名字不对 | 检查仓库/组织 Secret 名称，重新运行 |
| `401` / `403` | token 无效、过期、权限不对、租户不对 | 确认 token 在 bmw.ghe.com 创建，勾选 Copilot Requests，未过期 |
| `403` 且日志提示策略 | 组织/企业禁用了 Copilot CLI | 管理员开启 Copilot CLI 策略 |
| `none of the git remotes point to a known GitHub host` | `GH_HOST` 没设 | 设置 `NPC_GITHUB_HOST=bmw.ghe.com` |
| `model not found` / 模型不可用 | 模型名不在企业策略里 | 换 `COPILOT_MODEL`，或问管理员允许哪些模型 |
| `copilot: command not found` | CLI 没安装 | 检查 Action 的安装步骤；Node 版本要 22+ |
| `npm install -g @github/copilot` 失败 | npm 代理/镜像缺少平台包 | 让 runner 能访问 npm registry；或改用官方安装脚本 |
| workflow 卡住不动 | CLI 在等工具授权 | 看日志补 `--allow-tool`；确认 `--no-ask-user` 生效 |
| `--output-format json` 报未知参数 | CLI 版本不支持 | 把 `COPILOT_OUTPUT_FORMAT` 改回 `text` |
| `premium request` 超限 | 账号/组织额度用完 | 等重置、换账号、或降低 `COPILOT_BUDGET_PREMIUM_REQUESTS` |
| `NEXT:` 缺失 | agent 没按格式输出 | 看 `agent-output.txt`；必要时调整角色 prompt |
| PR 没创建 | App 权限不足 | 检查 Contents/Issues/Pull requests 写权限 |
| 评论身份不对 | App 名称和角色不一致 | App 名称必须是 `npc-pm` 等 |
| `.pem` 粘贴不完整 | App token 创建失败 | 必须包含 BEGIN/END 两行 |
| 没有 `npc-work-mode` 标签 | gate 拒绝写入 | 加标签后重新评论 `@npc-pm` |
| `main` 被保护，push 失败 | NPC 试图直推 main | 正常；NPC 只能推 `ai-npcs/issue-<n>` |
| PR 合并被挡 | Ruleset 配错 | 检查 “Applies to 0 targets”、Bypass list、Required approvals |
| token 泄露风险 | token 被打印 | 立即撤销、重新生成、检查日志 |
| 中文 Issue 回复英文 | prompt/模型未跟随 | 检查角色 prompt 的语言规则；换模型测试 |

### 17.1 怎么读 Action 日志

1. Actions → 对应 workflow → 最新 run。
2. 展开 **Install Copilot CLI**：确认安装成功。
3. 展开 **Run NPC agent**：
   - `NPC_RUNTIME=copilot`；
   - `GH_HOST=bmw.ghe.com`；
   - 不要出现 token 明文；
   - 看 `copilot` 的退出码和 stderr。
4. 下载 **npc-timing** artifact，看 `premiumRequests` 和 `model`。
5. 如果 agent 没有发评论，检查 `agent-output.txt` 里有没有 `NEXT:`。

---

## 18. 预算与成本

- Copilot CLI 每提交一个 prompt，消耗 **1 个 premium request × 模型倍率**。
- 默认预算：`COPILOT_BUDGET_PREMIUM_REQUESTS=250`，约等于 $10（按 $0.04/request 估算）。
- 实际计费以企业 Copilot 合同为准；AI credits 可能是 1 credit = $0.01。
- 预算是**软上限**：CLI 跑完才知道用量。要硬停只能用 `maxWallClockMinutes` / 外层 `timeout`。
- 建议每周看一次 Actions 的 `npc-timing.json`，按角色调整预算。

---

## 19. 回滚到 Claude Code

不需要回滚代码，两条路径都在：

1. 把仓库变量 `NPC_RUNTIME` 改成 `claude`（或删除）。
2. 配置 Claude 相关 Secret：
   - `CLAUDE_CODE_OAUTH_TOKEN`，或
   - `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL` + 模型变量。
   - 如果使用 Claude 订阅版 OAuth：在本地运行 `claude setup-token`，把结果填到 `CLAUDE_CODE_OAUTH_TOKEN`。
3. 重新运行 workflow。

旧文档 `docs/setup.md` 里的 Claude Code 步骤仍然适用，可以作为回滚参考。

> 如果只想在某个仓库试点，`NPC_RUNTIME` 是仓库级变量，不会影响其他仓库。

---

## 20. 安全注意事项

- `COPILOT_GITHUB_TOKEN` 只放 Secret，不放变量。
- 使用最小权限：PAT 只勾 Copilot Requests；App 只给 Contents/Issues/PR 写。
- 定期轮换；人员变动立即撤销。
- 不要 `echo` token；不要把它写进 Issue/评论/代码。
- `--allow-tool` 白名单 + `--deny-tool` 兜底；不要用 `--yolo`。
- 分支保护、draft PR、人工合并不能省。
- 把 Issue 文本当数据；角色 prompt 里已有这条规则，不要删。
- 公开仓库/外部 fork 不要把 token 暴露给不可信 workflow；本仓库是 Private，风险较低，但仍要遵守最小权限。

---

## 21. 命令速查

```bash
# 安装
npm install -g @github/copilot

# 交互式登录（GHE.com）
copilot login --host https://bmw.ghe.com

# 无交互运行（CI 风格）
COPILOT_GITHUB_TOKEN=... GH_HOST=bmw.ghe.com \
  copilot -p "只回复 OK" --no-ask-user

# 带 agent 和工具白名单
COPILOT_GITHUB_TOKEN=... GH_HOST=bmw.ghe.com \
  copilot -p "..." \
    --agent npc-pm \
    --model claude-sonnet-4.5 \
    --allow-tool='shell(git:*)' \
    --allow-tool='shell(gh:*)' \
    --allow-tool=write \
    --no-ask-user

# 查看帮助（确认你所在版本支持哪些 flag）
copilot --help
copilot help permissions
copilot help providers

# 本地验证
npm test
node scripts/verify-config.mjs

# GHE.com 上的 gh 命令
export GH_HOST=bmw.ghe.com
gh auth login --hostname bmw.ghe.com
gh issue view <n> --comments
gh pr list --head ai-npcs/issue-<n> --state open
```

---

## 22. 文件清单

| 路径 | 作用 |
|---|---|
| `.github/workflows/npc-dispatch.yml` | 人类评论统一分发 |
| `.github/workflows/npc-<role>.yml` | 五个角色的 workflow |
| `.github/actions/npc-agent/action.yml` | 复合 Action：App token、安装 CLI、gate、运行 agent |
| `scripts/run-agent.mjs` | 运行 Claude 或 Copilot，处理 `NEXT:`、预算、handoff |
| `scripts/copilot.mjs` | Copilot CLI 参数、认证、输出解析、custom agent 生成 |
| `scripts/gate.mjs` | 启动/写入门禁 |
| `scripts/ensure-branch-pr.mjs` | 幂等创建分支和 draft PR |
| `scripts/mention.mjs` / `next.mjs` / `team.mjs` | 提及解析、NEXT 解析、角色配置 |
| `scripts/dispatch-comment.mjs` | 人类评论分发 |
| `scripts/prepare-env.mjs` / `services.mjs` | 依赖准备、服务启停 |
| `scripts/timing.mjs` / `verify-config.mjs` | 计时汇总、配置校验 |
| `.github/npc/roles/*.md` | 五个角色的 prompt（运行时转成 Copilot custom agent） |
| `.github/npc/templates/*.md` | 派工单、汇报、状态、总结模板 |
| `.claude/skills/*/SKILL.md` | shared/角色 skill；Copilot CLI 自动识别 |
| `tests/` | `node --test` 单元测试 |
| `docs/superpowers/specs/2026-11-13-copilot-cli-design.md` | 设计方案 |
| `docs/setup-copilot-cli.md` | 本文（完整构建手册） |
| `docs/setup.md` | Claude Code / github.com 原始说明（回滚参考） |

---

## 23. 与旧文档 `docs/setup.md` 的关系

本文已经把旧文档里构建所需的步骤并进来，包括：

- 创建仓库、可见性说明；
- GitHub App 的完整创建细节（名称、Homepage URL、Webhook、权限、App ID、Key pairs、Install App）；
- Secrets 表格和 `.pem` 注意事项；
- `npc-work-mode` 标签；
- 推送代码；
- `main` 保护（Rulesets/Branches）；
- 本地验证（`npm test`、`verify-config`）；
- Stage 1 / Stage 2 验收；
- 常见错误。

不同点：

| 项目 | `docs/setup.md` | 本文 |
|---|---|---|
| 平台 | github.com / `br-ai-lab` | bmw.ghe.com / `<组织>` |
| AI 引擎 | Claude Code CLI | GitHub Copilot CLI |
| 认证 | `CLAUDE_CODE_OAUTH_TOKEN` / `ANTHROPIC_*` | `COPILOT_GITHUB_TOKEN` + `GH_HOST` |
| 模型 | Anthropic / 网关 | Copilot 策略允许的模型 |
| 预算 | `$10` | 250 premium requests（≈$10，可调） |
| 回滚 | — | `NPC_RUNTIME=claude` 保留 Claude 路径 |

> 旧文档仍然保留，用于 Claude Code 回滚或 github.com 部署；日常按本文操作即可。

---

## 24. 你还需要知道的边界

- **Copilot CLI 没有 `--max-turns`**：单次运行靠时间预算和 premium request 预算约束。
- **Copilot CLI 没有 `--system-prompt`**：角色 prompt 通过 custom agent（`~/.copilot/agents/npc-<slug>.agent.md`）注入。
- **`--allow-tool` 的 `shell(...)` 只匹配第一个子命令**：无法精确到 `git push --force` 这种整段参数；破坏性命令靠 prompt + 分支保护 + review。
- **GHE.com 的 Copilot CLI 支持情况以你们企业实例为准**：本文按官方文档和 GHE.com 的通用行为编写；如果遇到端点/策略差异，先跑第 13 节冒烟测试，再回来看第 17 节。
- **premium requests 是软上限**：CLI 跑完才知道用量；需要硬停时用 workflow 的 `timeout-minutes` 或角色时间预算。
- **`--output-format json` 不是所有版本都支持**：默认用 `text` + footer 解析；确认 `copilot --help` 后再改 `json`。
