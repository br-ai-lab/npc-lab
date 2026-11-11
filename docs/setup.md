# 设置说明（Stage 1）

这份文档带你从零配置 Stage 1：项目经理（`npc-pm`）+ Java 开发（`npc-java`）。
所有步骤都可以在 GitHub 网页完成；只有生成 Claude Code token 需要在本地终端跑一次命令。

## 1. 创建仓库

1. 打开 GitHub，进入你的账号 `winterSleep`。
2. 新建一个 **Public** 仓库，名称建议 `npc-lab`。
3. 不要初始化 README、`.gitignore` 或 License（本地已经有文件）。
4. 创建后先不要 push；等下面配置完再推。

## 2. 创建两个 GitHub App

Stage 1 需要两个 App：`npc-pm` 和 `npc-java`。**App 名称必须与角色 slug 完全一致**，因为 workflow 会用 `npc-pm` / `npc-java` 作为 git 提交身份。

对每个 App 重复以下步骤：

1. 打开 **Settings → Developer settings → GitHub Apps → New GitHub App**。
2. 填写：
   - **GitHub App name**：`npc-pm` 或 `npc-java`
   - **Homepage URL**：填你的仓库地址，例如 `https://github.com/winterSleep/npc-lab`
   - **Webhook**：取消勾选 **Active**
3. **Repository permissions** 设置为：
   - **Contents**：Read and write
   - **Issues**：Read and write
   - **Pull requests**：Read and write
   - **Metadata**：Read-only（默认）
4. 其他权限保持默认，不要给 Administration 权限。
5. 点击 **Create GitHub App**。
6. 在 App 页面记录 **App ID**（一串数字）。
7. 页面底部点击 **Generate a private key**，下载 `.pem` 文件。不要把这个文件提交到仓库。
8. 点击 **Install App**，选择 **Only select repositories** → `npc-lab` → **Install**。

> 私有 key 只显示/下载一次。丢了就重新生成，并更新对应的 GitHub Secret。

## 3. 添加仓库 Secrets

打开 `npc-lab` 仓库 → **Settings → Secrets and variables → Actions → New repository secret**，添加：

| Secret 名称 | 值 |
|---|---|
| `NPC_PM_APP_ID` | `npc-pm` 的 App ID |
| `NPC_PM_PRIVATE_KEY` | `npc-pm` 的 `.pem` 文件全文（包含 BEGIN/END 行） |
| `NPC_JAVA_APP_ID` | `npc-java` 的 App ID |
| `NPC_JAVA_PRIVATE_KEY` | `npc-java` 的 `.pem` 文件全文 |
| `CLAUDE_CODE_OAUTH_TOKEN` | 下一步生成的 token |

## 4. 生成 Claude Code token

在你的电脑上打开终端，运行：

```bash
claude setup-token
```

按提示在浏览器授权，复制生成的 token，粘贴到上表的 `CLAUDE_CODE_OAUTH_TOKEN`。

> 这个 token 使用你的 Claude Code 订阅额度。不要把它写进代码或评论。

## 5. 创建标签

打开仓库 → **Issues → Labels → New label**：

- 名称：`npc-work-mode`
- 颜色：红色或橙色（例如 `#D93F0B`）
- 描述：允许 AI 团队写入代码；只有 Owner/Member/Collaborator 可以添加。

## 6. 推送本地代码

先推送代码，再开分支保护，避免第一次 push 被保护规则拦住。

在本地 `npc-lab` 目录：

```bash
git remote add origin https://github.com/winterSleep/npc-lab.git
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

打开仓库 → **Settings → Branches → Add branch protection rule**：

- Branch name pattern：`main`
- 勾选 **Require a pull request before merging**
- 取消勾选 **Dismiss stale pull request approvals when new commits are pushed**（参考案例里没有强制 review）
- 勾选 **Do not allow bypassing the above settings**（如果可用）
- 不要开启 **Allow auto-merge**
- 保存

这样 NPC 只能把提交推到 `ai-npcs/issue-<n>`，最终由人类合并 PR。

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

- **App 名称和角色不一致**：git 提交身份会不对，评论也可能显示错。App 名称必须是 `npc-pm`、`npc-java`、`npc-ocr`、`npc-react`、`npc-qa`。
- **Private key 粘贴不完整**：Secret 里必须包含 `-----BEGIN RSA PRIVATE KEY-----` 和 `-----END RSA PRIVATE KEY-----`。
- **没有 `npc-work-mode` 标签**：NPC 只会评论，不会写代码。
- **PR 没有出现**：检查 `npc-pm` 是否有 Contents/Issues/Pull requests 写权限，以及 `main` 是否允许创建分支。
- **token 过期/额度用完**：重新运行 `claude setup-token`，更新 `CLAUDE_CODE_OAUTH_TOKEN`。
