# 设置说明（Stage 1）

这份文档带你从零配置 Stage 1：项目经理（`npc-pm`）+ Java 开发（`npc-java`）。
所有步骤都可以在 GitHub 网页完成；只有生成 Claude Code token 需要在本地终端跑一次命令。

## 1. 创建仓库

1. 打开 GitHub，进入 `br-ai-lab`（账号或组织）。
2. 新建一个仓库，名称建议 `npc-lab`。
3. 不要初始化 README、`.gitignore` 或 License（本地已经有文件）。
4. 创建后先不要 push；等下面配置完再推。

### Public 还是 Private？

| 选项 | GitHub Actions | `main` 分支保护 | 适合 |
|---|---|---|---|
| **Public** | 标准 runner 免费无限 | Free 计划也可用 | 推荐：实验、Free 计划 |
| **Private + Pro/Team/Enterprise** | 每月 2,000–50,000 分钟 | 可用 | 代码不公开、有付费计划 |
| **Private + Free** | 每月 2,000 分钟 | **不可用**（需要 Pro 或改为 Public） | 不推荐：`main` 保护只能靠 prompt |

> 需求文档要求“主分支保护必须技术强制”。如果你在 Free 计划下用 Private，这条无法满足；要么改用 Public，要么升级到 Pro/Team/Enterprise。

## 2. 创建两个 GitHub App

Stage 1 需要两个 App：`npc-pm` 和 `npc-java`。**App 名称必须与角色 slug 完全一致**，因为 workflow 会用 `npc-pm` / `npc-java` 作为 git 提交身份。

对每个 App 重复以下步骤：

> 如果 `br-ai-lab` 是组织，从组织页面的 **Settings → Developer settings → GitHub Apps** 进入；如果是个人账号，从个人 **Settings → Developer settings → GitHub Apps** 进入。

1. 打开 **Settings → Developer settings → GitHub Apps → New GitHub App**。
2. 填写：
   - **GitHub App name**：`npc-pm` 或 `npc-java`
   - **Homepage URL**：填你的仓库地址，例如 `https://github.com/br-ai-lab/npc-lab`
     - 两个 App 可以填同一个 URL；它只是 App 的介绍页，不影响 NPC 身份。
     - NPC 的身份由 **GitHub App name**（`npc-pm` / `npc-java`）决定，不是 Homepage URL。

> **为什么两个 App 可以共用同一个 Homepage URL？** Homepage URL 只是介绍页，不参与运行。区分角色的是 App 名称/slug、App ID/private key、对应 workflow 和 role prompt。两个 App 都安装到同一个 `npc-lab` 仓库，是因为它们要在同一个 Issue 里协作，不是因为它们是同一个角色。
   - **Webhook**：取消勾选 **Active**
3. **Repository permissions** 设置为：
   - **Contents**：Read and write
   - **Issues**：Read and write
   - **Pull requests**：Read and write
   - **Metadata**：Read-only（默认）
4. 其他权限保持默认，不要给 Administration 权限。
5. 点击 **Create GitHub App**。
6. 创建完成后，你会进入这个 App 的设置页。左侧选择 **General**（默认就是它），页面顶部 **About** 区域有一行 **App ID**，是一串数字（例如 `1234567`）。把这个数字记下来。
   - 如果关掉了页面，可以这样找回：
     - 个人账号：打开 `https://github.com/settings/apps`，点 `npc-pm` 或 `npc-java`
     - 组织：打开 `https://github.com/organizations/br-ai-lab/settings/apps`，点对应 App
   - App 设置页的 URL 形如 `https://github.com/settings/apps/npc-pm` 或 `https://github.com/organizations/br-ai-lab/settings/apps/npc-pm`。
7. 看左侧菜单，点击 **Credentials**，再点击 **Key pairs**。私钥不在 General 页面里。
8. 点击 **New key**。浏览器会立刻下载一个 `.pem` 文件，文件名类似 `npc-pm.2026-11-12.private-key.pem`，一般在你电脑的“下载/Downloads”文件夹。
   - GitHub 不会再次显示这个私钥；如果丢了，只能点 **New key** 重新生成，然后更新对应的 GitHub Secret。
   - 不要把这个 `.pem` 文件提交到仓库，也不要发到聊天里。
9. 点击 **Install App**，选择 **Only select repositories** → `npc-lab` → **Install**。

> **Install App 页面列出的是“可以安装到的账号/组织”，不是 App 名称。** 看到 `br-ai-lab` 是对的：它表示把 `npc-pm` / `npc-java` 安装到 `br-ai-lab` 这个账号/组织下。点 `br-ai-lab` 旁边的 **Install**，再选择 `npc-lab` 仓库。
>
> 如果 `npc-lab` 还没创建，或者列表里看不到它，先回到第 1 步创建仓库，再刷新这个页面。

> 2026 年的 GitHub UI 把私钥放在 **Credentials → Key pairs → New key**。如果你看到的是旧版界面，入口可能是页面底部的 **Private keys → Generate a private key**，两者是同一个东西。

> 私有 key 只显示/下载一次。丢了就重新生成，并更新对应的 GitHub Secret。

## 3. 添加仓库 Secrets

打开 `npc-lab` 仓库 → **Settings → Secrets and variables → Actions → New repository secret**，添加：

| Secret 名称 | 值 |
|---|---|
| `NPC_PM_APP_ID` | `npc-pm` 的 App ID |
| `NPC_PM_PRIVATE_KEY` | `npc-pm` 的 `.pem` 文件全文（包含 BEGIN/END 行） |
| `NPC_JAVA_APP_ID` | `npc-java` 的 App ID |
| `NPC_JAVA_PRIVATE_KEY` | `npc-java` 的 `.pem` 文件全文 |
| `ANTHROPIC_AUTH_TOKEN` | `~/.claude/settings.json` 第 4 行的值 |
| `ANTHROPIC_BASE_URL` | 同文件第 3 行的值 |
| `ANTHROPIC_MODEL` | 同文件第 5 行的值 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | 同文件第 6 行的值 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | 同文件第 7 行的值 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | 同文件第 8 行的值 |
| `CLAUDE_CODE_OAUTH_TOKEN` | 可选：只有用方式 B 时才填 |

> `.pem` 是文本文件。用 VS Code 或记事本打开它，全选复制，粘贴到对应的 Secret 值里。内容必须包含 `-----BEGIN RSA PRIVATE KEY-----` 和 `-----END RSA PRIVATE KEY-----` 两行，否则 App token 会创建失败。

## 4. 配置模型认证（二选一）

### 方式 A：使用你现有的 ANTHROPIC_AUTH_TOKEN（推荐）

你的 `~/.claude/settings.json` 里已经有：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "<第 3 行>",
    "ANTHROPIC_AUTH_TOKEN": "<第 4 行>",
    "ANTHROPIC_MODEL": "<第 5 行>",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "<第 6 行>",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "<第 7 行>",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "<第 8 行>"
  }
}
```

1. 打开文件：

   ```bash
   code ~/.claude/settings.json
   ```

2. 把第 3–8 行的值复制到上面表格对应的 GitHub Secret。
3. **不要运行 `claude setup-token`**；这种方式使用你现有的网关/代理认证。
4. 不要把 token 粘贴到 Issue、代码或聊天里。

### 方式 B：生成 Claude Code OAuth token

如果你不想用方式 A，或者没有 `ANTHROPIC_AUTH_TOKEN`，可以运行：

```bash
claude setup-token
```

按提示在浏览器授权，把生成的 token 填到 `CLAUDE_CODE_OAUTH_TOKEN`。

> 如果 `claude setup-token` 提示“you already have authentication configured”，说明方式 A 已经配置好了；按 `Ctrl+C` 取消即可，不需要新 token。

## 5. 创建标签

打开仓库 → **Issues → Labels → New label**：

- 名称：`npc-work-mode`
- 颜色：红色或橙色（例如 `#D93F0B`）
- 描述：允许 AI 团队写入代码；只有 Owner/Member/Collaborator 可以添加。

## 6. 推送本地代码

先推送代码，再开分支保护，避免第一次 push 被保护规则拦住。

在本地 `npc-lab` 目录：

```bash
git remote add origin https://github.com/br-ai-lab/npc-lab.git
git push -u origin feat/ai-npc-team:main
```

如果你不想直接推 `main`，可以先推一个分支，再在网页开 PR 合并。推完后确认仓库里能看到：

- `.github/workflows/npc-pm.yml`
- `.github/workflows/npc-java.yml`
- `.github/actions/npc-agent/action.yml`
- `scripts/`
- `.claude/skills/`
- `.github/npc/`

## 7. 保护 `main`

GitHub 现在推荐用 **Rulesets**（**Settings → Rules → Rulesets**）；旧的 **Branches** 页面也能用。两种方式都按下面的标准配置。

### 规则目标

- Target branches：包含 `main`（或 `~DEFAULT_BRANCH`）
- Enforcement：**Active**（不是 Evaluate / Disabled）

> 如果页面显示 **“Applies to 0 targets”**，说明规则没有匹配任何分支，等于没开。必须点 **Add target** → **Include default branch**，或 **Include by pattern** 填 `main`。

### 必须开启

- **Require a pull request before merging**：ON
  - **Required approvals**：**0**（自己实验时，填 1 会导致你无法批准自己的 PR）
  - **Dismiss stale pull request approvals**：OFF
  - **Require review from Code Owners**：OFF
  - **Require approval of the most recent reviewable push**：OFF
- **Block force pushes**：ON
- **Restrict deletions**：ON

### 建议关闭

- **Restrict creations / Restrict updates**：OFF。开了且 Bypass list 为空时，可能连 PR 合并都被挡住；`Require a pull request` 已经够用。
- **Require status checks to pass**：OFF（目前没有配置 status checks；开了会挡住 PR）
- **Require signed commits**：OFF（NPC 用 App 身份提交，可能不是签名提交）
- **Require linear history**：可选
- **Require merge queue**：OFF
- **Require deployments**：OFF
- **Require code scanning / code quality / code coverage**：OFF
- **Require an additional approval for unattributed Copilot pull requests**：OFF。我们不用 Copilot coding agent；而且 Required approvals = 0 时这条没有效果。
- **Automatically request Copilot code review**：OFF

### Bypass list

- 不要加入 `npc-pm` / `npc-java`；否则 NPC 可以绕过规则直接推 `main`。
- 如果只加入你自己（admin）用于紧急情况，可以接受，但技术强制会弱一点。

### 仓库设置

- **Settings → General → Pull Requests → Allow auto-merge**：**OFF**
- 不要开启自动合并。

这样 NPC 只能把提交推到 `ai-npcs/issue-<n>`，最终由人类合并 PR。

> 如果仓库是 **Private + Free**，Rulesets / Branches 可能不可用；改用 Public，或升级到 Pro/Team/Enterprise。

## 8. 验证

在本地运行：

```bash
npm test
node scripts/verify-config.mjs
```

预期：测试全部通过，输出 `config ok`。

## 9. Stage 2 再补三个 App

Stage 2 需要再加：

- `npc-ocr`
- `npc-react`
- `npc-qa`

对每个重复第 2 步和第 3 步，Secret 名分别为：

- `NPC_OCR_APP_ID` / `NPC_OCR_PRIVATE_KEY`
- `NPC_REACT_APP_ID` / `NPC_REACT_PRIVATE_KEY`
- `NPC_QA_APP_ID` / `NPC_QA_PRIVATE_KEY`

Stage 2 的 workflow 会在任务 12 创建。

## 常见问题

- **`claude setup-token` 提示 “you already have authentication configured”**：说明你已经配置了 `ANTHROPIC_AUTH_TOKEN` / `ANTHROPIC_BASE_URL`。用方式 A：把 `~/.claude/settings.json` 第 3–8 行的值填进 GitHub Secrets，然后取消 `setup-token`，不需要新 token。
- **Workflow 报认证失败**：检查 `ANTHROPIC_AUTH_TOKEN` 和 `ANTHROPIC_BASE_URL` 是否都填了，值是否来自同一个 `~/.claude/settings.json`。
- **Workflow 报 model not found**：把 `ANTHROPIC_MODEL`、`ANTHROPIC_DEFAULT_OPUS_MODEL`、`ANTHROPIC_DEFAULT_SONNET_MODEL`、`ANTHROPIC_DEFAULT_HAIKU_MODEL` 四个 Secret 也填上。
- **App 名称和角色不一致**：git 提交身份会不对，评论也可能显示错。App 名称必须是 `npc-pm`、`npc-java`、`npc-ocr`、`npc-react`、`npc-qa`。
- **Private key 粘贴不完整**：Secret 里必须包含 `-----BEGIN RSA PRIVATE KEY-----` 和 `-----END RSA PRIVATE KEY-----`。
- **没有 `npc-work-mode` 标签**：NPC 只会评论，不会写代码。
- **PR 没有出现**：检查 `npc-pm` 是否有 Contents/Issues/Pull requests 写权限，以及 `main` 是否允许创建分支。
- **token 过期/额度用完**：重新运行 `claude setup-token`，更新 `CLAUDE_CODE_OAUTH_TOKEN`。
