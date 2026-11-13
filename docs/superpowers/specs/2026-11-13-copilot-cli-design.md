# NPC 团队切换到 GitHub Copilot CLI（bmw.ghe.com）设计方案

> 日期：2026-11-13
> 状态：已实施（2026-11-13），待 bmw.ghe.com 冒烟验证
> 目标读者：项目发起人、第一次接触 GitHub Actions / Copilot CLI 的同学
> 关联文档：
> - 原始实施计划：`docs/superpowers/plans/2026-11-11-ai-npc-team.md`
> - 需求文档：`docs/requirements.md`
> - 新部署手册：`docs/setup-copilot-cli.md`
> - 原部署手册：`docs/setup.md`

---

## 1. 背景与目标

### 1.1 现状

npc-lab 现在用 **Claude Code CLI** 作为 agent runtime：

- 每个角色一个 GitHub App，负责 Issue 评论、提交、PR、dispatch。
- 每个角色一个 workflow，workflow 调用复合 Action。
- 复合 Action 安装 `@anthropic-ai/claude-code`，然后运行 `scripts/run-agent.mjs`。
- `run-agent.mjs` 用 `claude -p ... --append-system-prompt ... --allowedTools ...` 启动 agent。
- 模型认证来自 `CLAUDE_CODE_OAUTH_TOKEN`，或 `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL`。

### 1.2 新目标

在 **bmw.ghe.com（GitHub Enterprise Cloud + data residency）** 上再部署一套 npc-lab，使用：

- **GitHub Copilot CLI** 作为 agent runtime；
- **`COPILOT_GITHUB_TOKEN`** 作为 Copilot 认证；
- **不动 npc-lab 的协作架构**：五角色、独立 App 身份、单分支 `ai-npcs/issue-<n>`、draft PR、`NEXT:` 接力、人类合并闸门。

### 1.3 非目标

- 不把 npc-lab 改造成 Copilot coding agent 的“Issue 指派”模式。
- 不在本次改造中支持多仓库、多组织或 B 版本的配置化运行时。
- 不改变 `.npc/issue-<n>/handoff.json`、`NEXT:` 协议、gate、分支/PR 规则。
- 不把 Copilot CLI 的 BYOK（自带模型）作为主路径；本次固定使用 `COPILOT_GITHUB_TOKEN`。

---

## 2. 已确认的决策

| 决策项 | 结论 |
|---|---|
| agent runtime | GitHub Copilot CLI（`@github/copilot`） |
| Copilot 认证 | `COPILOT_GITHUB_TOKEN`（fine-grained PAT / GitHub App installation token） |
| 目标平台 | bmw.ghe.com |
| GHE.com 主机 | `GH_HOST=bmw.ghe.com` |
| Claude Code 是否保留 | 保留为回滚路径，由 `NPC_RUNTIME=claude` 控制 |
| 默认运行时 | `NPC_RUNTIME` 未设置时为 `claude`，避免破坏现有 github.com 部署；bmw.ghe.com 的仓库变量设为 `copilot` |
| 角色 prompt | 继续放在 `.github/npc/roles/*.md`，运行时转换成 Copilot custom agent |
| skills | 继续放在 `.claude/skills/`，Copilot CLI 原生识别 |
| 成本预算 | 以 premium requests 计；默认上限 250（约等于 $10，按 $0.04/request 估算），可用仓库变量覆盖 |
| 输出解析 | 默认解析文本 + 用量 footer；可选 `--output-format json` |
| 是否引入 npm 依赖 | 不引入；CLI 由 Action 全局安装，`package.json` 保持零依赖 |

---

## 3. 方案对比

| 方案 | 改动量 | 依赖 | 认证 | 适用性 |
|---|---|---|---|---|
| **A. Copilot CLI（选中）** | 中 | 全局 CLI，不进入 `package.json` | `COPILOT_GITHUB_TOKEN` | 最贴近现有 `run-agent.mjs`，回滚容易 |
| B. Copilot SDK | 大 | `@github/copilot-sdk` 运行时依赖 | token / BYOK | 控制粒度最好，但违背“零运行时依赖” |
| C. Copilot coding agent | 很大 | 无 | 内置 | 失去多角色接力，不适合 |

选 A 的理由：

1. `run-agent.mjs` 仍然是“启动子进程 + 解析输出”，改动集中在参数和解析。
2. 不需要给项目加 npm 运行时依赖。
3. `.claude/skills/` 可直接复用。
4. 保留 Claude Code 路径，bmw.ghe.com 试点失败可一键回滚。

---

## 4. 认证设计

### 4.1 认证变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `COPILOT_GITHUB_TOKEN` | 是 | Copilot 认证 token；bmw.ghe.com 租户签发 |
| `GH_HOST` | bmw.ghe.com 必填 | `bmw.ghe.com`，必须是主机名，不带 `https://` |
| `COPILOT_MODEL` | 否 | 模型名；默认 `claude-sonnet-4.5`，以企业策略允许的模型为准 |
| `COPILOT_BUDGET_PREMIUM_REQUESTS` | 否 | 单次运行 premium request 上限；默认 250 |
| `COPILOT_OUTPUT_FORMAT` | 否 | `text`（默认）或 `json` |
| `NPC_RUNTIME` | 否 | `claude`（默认）或 `copilot` |

token 优先级（Copilot CLI 自身）：

```text
COPILOT_GITHUB_TOKEN > GH_TOKEN > GITHUB_TOKEN
```

注意：`GH_TOKEN` 在我们的 Action 里是 **GitHub App installation token**，用于 `gh`/`git`；不要把 Copilot token 和 App token 混用。只要设置了 `COPILOT_GITHUB_TOKEN`，Copilot CLI 会优先用它做 Copilot 推理；`GH_TOKEN` 继续给 `gh`/`git` 用。

### 4.2 token 类型

支持：

- fine-grained PAT（权限选 **Copilot Requests**）；
- GitHub App installation token（App 权限选 **Copilot Requests**）；
- OAuth token（`gho_`）/ GitHub App user-to-server（`ghu_`）。

不支持：

- 经典 `ghp_` PAT；
- github.com 签发的 token 用在 bmw.ghe.com；
- Actions 的 `GITHUB_TOKEN`（`ghs_`）直接当 `COPILOT_GITHUB_TOKEN`（除非企业明确支持 `copilot-requests: write` 的组织计费路径；本方案不依赖它）。

### 4.3 GHE.com 认证流程

```text
bmw.ghe.com 创建 fine-grained PAT（Copilot Requests）
        │
        ▼
仓库/组织 Secret: COPILOT_GITHUB_TOKEN
        │
        ▼
Action 环境: COPILOT_GITHUB_TOKEN + GH_HOST=bmw.ghe.com
        │
        ▼
copilot CLI → Copilot 推理端点 copilot-api.bmw.ghe.com
```

### 4.4 前置条件（部署前必须确认）

1. bmw.ghe.com 企业/组织有 Copilot 付费计划，且 CLI 可用。
2. 企业/组织策略允许 Copilot CLI：
   - 组织：Settings → Copilot → Policies → Copilot CLI；
   - 企业：Enterprise settings → Copilot → Policies。
3. 用于 CI 的 token 所属账号有 Copilot 许可，且企业允许其跑自动化。
4. 建议使用**专用服务账号**，不要用个人日常账号。

### 4.5 安全规则

- token 只放在 GitHub Actions Secret，不写进代码、Issue、日志。
- 使用最小权限：fine-grained PAT 只勾选 Copilot Requests；GitHub App 只给必需权限。
- 定期轮换；离职/换岗立即撤销。
- Action 日志里不要 `echo` token；`run-agent.mjs` 不打印 env。
- `--allow-tool` 用白名单，`--deny-tool` 兜底危险命令。
- 把 Issue 文本当数据，不当指令；prompt 继续保留这条规则。

---

## 5. 运行架构

```text
人类评论 @npc-pm + npc-work-mode 标签
        │
        ▼
npc-dispatch.yml（人类评论统一入口）
        │  repository_dispatch
        ▼
npc-<role>.yml
        │
        ├─ actions/create-github-app-token → GH_TOKEN（角色身份）
        ├─ checkout Issue 分支
        ├─ 安装 @github/copilot
        ├─ gate.mjs（标签/作者/mention）
        ├─ ensure-branch-pr.mjs（PM 首次）
        └─ ./github/actions/npc-agent
                │
                ├─ 生成 ~/.copilot/agents/npc-<role>.agent.md
                ├─ run-agent.mjs
                │     ├─ NPC_RUNTIME=copilot
                │     ├─ COPILOT_GITHUB_TOKEN + GH_HOST
                │     ├─ copilot -p <issue prompt> --agent npc-<role> ...
                │     ├─ 解析最终文本 + premium requests
                │     ├─ 预算检查
                │     ├─ 写 handoff.json
                │     └─ parseNext → repository_dispatch
                └─ 上传 npc-timing.json
```

角色自己的评论、提交、PR、dispatch 仍然使用 **该角色的 GitHub App token**，不使用 `GITHUB_TOKEN`。

---

## 6. 代码改造清单

### 6.1 新增 `scripts/copilot.mjs`

职责：把 Copilot CLI 的细节集中在一个模块里，方便单测。

导出接口：

```js
export const DEFAULT_AGENT_TOOLS = ["read", "edit", "search", "execute", "skill"];
export const DEFAULT_COPILOT_MODEL = "claude-sonnet-4.5";
export const DEFAULT_PREMIUM_REQUEST_BUDGET = 250;

export function translateAllowedTools(allowedTools) {}
// 输入: "Bash(git:*),Bash(gh:*),Read,Write,Edit,Glob,Grep"
// 输出: { shell: ["git:*", "gh:*"], write: true, tools: ["read","edit","search"] }

export function buildCopilotArgs({ prompt, agentName, model, allowedTools, outputFormat }) {}
// 输出 argv（不含 "copilot" 本身）

export function buildCopilotEnv(baseEnv) {}
// 删除空值；要求 COPILOT_GITHUB_TOKEN；保留 GH_HOST / COPILOT_MODEL

export function parseCopilotOutput(stdout) {}
// 兼容 JSON 和 text+footer；返回 { text, premiumRequests, model }

export function prepareCopilotAgent({ role, promptPath, model, dir }) {}
// 读取角色 prompt，写 ~/.copilot/agents/npc-<slug>.agent.md

export function premiumRequestBudget(baseEnv) {}
export function summarizeCopilotRun({ wallClockMs, premiumRequests, model }) {}
```

### 6.2 `scripts/run-agent.mjs`

- 引入 `copilot.mjs`。
- `AUTH_ENV_KEYS` 增加：
  `COPILOT_GITHUB_TOKEN`、`GH_HOST`、`COPILOT_MODEL`、`COPILOT_OUTPUT_FORMAT`、
  `COPILOT_BUDGET_PREMIUM_REQUESTS`、`NPC_RUNTIME`。
- `buildAgentEnv(baseEnv, runtime = "claude")`：
  - `runtime === "copilot"`：要求 `COPILOT_GITHUB_TOKEN`；
  - `runtime === "claude"`：保持原有 `ANTHROPIC_AUTH_TOKEN` / `CLAUDE_CODE_OAUTH_TOKEN` 检查；
  - 空值继续删除。
- 新增 `runCopilot(args, env, timeoutMs)`，复用现有的进程管理（超时、kill 进程组、stdout/stderr 捕获）。
- CLI 入口：
  ```js
  const runtime = process.env.NPC_RUNTIME || "claude";
  if (runtime === "copilot") {
    prepareCopilotAgent({...});
    const args = buildCopilotArgs({...});
    const result = await runCopilot(args, buildAgentEnv(process.env, "copilot"), timeoutMs);
    const { text, premiumRequests } = parseCopilotOutput(result.stdout);
    // 预算检查、timing、handoff、parseNext、dispatch
  } else {
    // 现有 Claude 路径不变
  }
  ```
- 预算：
  - `premiumRequests > budget` → 评论 `@<owner> 已达到 Copilot 预算上限（N premium requests），请人工确认。`，在 dispatch 前退出 0。
  - 用量解析不到时：写日志 + timing 标记 `premiumRequests: null`，继续执行（不假装 0）。
  - `costUsdApprox = premiumRequests * 0.04` 仅用于展示，不参与判断。
- `npc-timing.json` 增加 `runtime`、`premiumRequests`、`budgetPremiumRequests`、`model`；Claude 路径保持原字段。

### 6.3 `scripts/timing.mjs`

保持不变，继续供 Claude 回滚路径使用。

Copilot 的用量汇总放在 `scripts/copilot.mjs` 的 `summarizeCopilotRun()`：

```js
summarizeCopilotRun({ wallClockMs, premiumRequests, model, budgetPremiumRequests })
// 返回 runtime / wallClockMs / model / premiumRequests / budgetPremiumRequests /
// costUsdApprox / toolCalls / assistantTurns / tools / topTools
```

`run-agent.mjs` 根据 runtime 选择 `summarizeEvents`（Claude）或 `summarizeCopilotRun`（Copilot），两者都写入 `npc-timing.json`。

### 6.4 `.github/actions/npc-agent/action.yml`

新增 inputs：

| input | 默认 | 说明 |
|---|---|---|
| `runtime` | `claude` | `copilot` 或 `claude` |
| `copilot-token` | `""` | 对应 `COPILOT_GITHUB_TOKEN` |
| `copilot-model` | `""` | 空则用 `claude-sonnet-4.5` |
| `github-host` | `""` | bmw.ghe.com 填 `bmw.ghe.com` |
| `copilot-budget-premium-requests` | `""` | 空则用 `250` |
| `copilot-output-format` | `""` | 空则用 `text`；可设 `json` |

步骤变化：

1. 安装步骤按 runtime 二选一：
   ```yaml
   - name: Install Claude Code
     if: inputs.runtime != 'copilot'
     run: npm install -g @anthropic-ai/claude-code
   - name: Install Copilot CLI
     if: inputs.runtime == 'copilot'
     run: npm install -g @github/copilot
   ```
2. `Configure git and gh`、gate、ensure-branch-pr、run-agent 步骤都加：
   ```yaml
   GH_HOST: ${{ inputs.github-host }}
   ```
3. run-agent 步骤 env 增加：
   ```yaml
   NPC_RUNTIME: ${{ inputs.runtime }}
   COPILOT_GITHUB_TOKEN: ${{ inputs.copilot-token }}
   COPILOT_MODEL: ${{ inputs.copilot-model || 'claude-sonnet-4.5' }}
   COPILOT_BUDGET_PREMIUM_REQUESTS: ${{ inputs.copilot-budget-premium-requests || '250' }}
   ```
4. 原有 Claude 输入保留，回滚时继续可用。

### 6.5 五个角色 workflow

每个 workflow 的 `with:` 增加：

```yaml
runtime: ${{ vars.NPC_RUNTIME || 'claude' }}
copilot-token: ${{ secrets.COPILOT_GITHUB_TOKEN }}
copilot-model: ${{ vars.COPILOT_MODEL }}
copilot-output-format: ${{ vars.COPILOT_OUTPUT_FORMAT }}
github-host: ${{ vars.NPC_GITHUB_HOST }}
copilot-budget-premium-requests: ${{ vars.COPILOT_BUDGET_PREMIUM_REQUESTS }}
```

- bmw.ghe.com：仓库变量 `NPC_RUNTIME=copilot`、`NPC_GITHUB_HOST=bmw.ghe.com`。
- github.com：不设置这些变量，默认走 Claude。
- 原有 `claude-token` / `anthropic-*` 输入保留，便于回滚。

### 6.6 `scripts/verify-config.mjs`

- 把 `claude-token` / `anthropic-auth-token` 的强制检查改为：
  - 每个 workflow 必须包含 `copilot-token`；
  - 每个 workflow 必须包含 `vars.NPC_GITHUB_HOST`；
  - 每个 workflow 必须包含 `runtime:`；
  - composite action 必须包含 `@github/copilot` 和 `@anthropic-ai/claude-code` 两个安装分支。
- 保留 `npc-timing.json`、gate、concurrency、禁止 merge 等检查。

### 6.7 测试

新增 `tests/copilot.test.mjs`：

- `translateAllowedTools`：`Bash(git:*)` → `shell(git:*)`；`Read/Write/Edit/Glob/Grep` → tool 列表。
- `buildCopilotArgs`：包含 `-p`、`--agent`、`--model`、`--allow-tool`、`--deny-tool`、`--no-ask-user`。
- `parseCopilotOutput`：
  - JSON `{ result, usage: { premiumRequests } }`；
  - JSONL 最后一条 result；
  - 纯文本 + `Total usage est: 3 Premium request(s)`。
- `buildCopilotEnv`：缺 token 抛错；保留 `GH_HOST`；删除空值。
- `prepareCopilotAgent`：写入临时目录，检查 frontmatter。
- `summarizeCopilotRun`：premium requests 和 `costUsdApprox`。

更新：

- `tests/run-agent.test.mjs`：保留 Claude 用例；新增 copilot runtime 的 `buildAgentEnv` 用例。
- `tests/timing.test.mjs`：保持 Claude 汇总用例；Copilot 汇总用例放在 `tests/copilot.test.mjs`。
- `tests/verify-config.test.mjs`：不需要改断言，但 verifier 的检查项会随 workflow 更新。

### 6.8 文档

- 新增本设计文档。
- 新增 `docs/setup-copilot-cli.md`（小白向部署手册）。
- 修改 `docs/setup.md` 顶部加一行提示：GHE.com + Copilot CLI 请看新手册。
- 不修改历史 plan 的正文；plan 差异在本文件第 12 节记录。

---

## 7. 角色 prompt 与 skills 复用

### 7.1 prompt

继续使用 `.github/npc/roles/*.md` 作为唯一来源。运行时生成：

```text
~/.copilot/agents/npc-<slug>.agent.md
```

格式：

```markdown
---
name: npc-pm
description: 项目经理
tools: ["read", "edit", "search", "execute", "skill"]
model: claude-sonnet-4.5
---

<原角色 prompt 全文>
```

- `name` 用 slug（`npc-pm`）。
- `description` 用 `TEAM[].name`。
- `tools` 用默认列表；角色范围仍靠 prompt 约束。
- 生成目录优先用 `COPILOT_HOME/agents`，否则 `~/.copilot/agents`。

这样 `team.mjs` 的 `promptPath`、`tests/prompts.test.mjs` 都不用改。

### 7.2 skills

`.claude/skills/*/SKILL.md` 是 Copilot CLI 官方支持的目录之一，自动发现，按需加载。现有：

- `npc-github`：共享 `gh`/git/mention/安全规则；
- 五个角色 skill。

不需要修改。角色 prompt 里已经引用 `.github/npc/templates/...` 和 `@npc-pm` 规则。

### 7.3 系统 prompt

Copilot CLI 没有 `--system-prompt` 参数；custom agent 的正文就是角色 prompt，等价于 Claude Code 的 `--append-system-prompt`。

---

## 8. 权限与工具白名单

### 8.1 现有 `allowed-tools` 的翻译

workflow 里的 `allowed-tools` 继续沿用，`copilot.mjs` 负责翻译：

| Claude Code | Copilot CLI |
|---|---|
| `Bash(git:*)` | `--allow-tool 'shell(git:*)'` |
| `Bash(gh:*)` | `--allow-tool 'shell(gh:*)'` |
| `Bash(mvn:*)` | `--allow-tool 'shell(mvn:*)'` |
| `Read` | agent tools `read` |
| `Write` / `Edit` | agent tools `edit` + `--allow-tool write` |
| `Glob` / `Grep` | agent tools `search` |

### 8.2 deny 列表

默认 deny：

```text
shell(rm)
shell(sudo)
shell(shutdown)
shell(reboot)
shell(mkfs)
shell(dd)
```

说明：

- Copilot CLI 的 `shell(...)` 只匹配第一个子命令，无法表达 `git push --force` 这种整段参数。
- 破坏性命令主要靠 prompt、分支保护、人类 review 兜底。
- 如果发现 CLI 因未授权的工具停下来，优先补充 `--allow-tool`，不要直接 `--yolo`。

### 8.3 非交互

- `--no-ask-user`：禁止交互提问，避免 CI 挂起。
- 如果某个工具未授权，CLI 可能拒绝并继续/退出；日志会显示，按日志补白名单。
- 不默认使用 `--yolo` / `--allow-all-tools`。

---

## 9. 预算、时间与轮数

### 9.1 预算

| 指标 | 值 |
|---|---|
| 默认上限 | `COPILOT_BUDGET_PREMIUM_REQUESTS=250` |
| 换算 | 250 × $0.04 ≈ $10（legacy 超额单价） |
| 实际计费 | 以企业 Copilot 合同为准；AI credits 可能是 1 credit = $0.01 |
| 解析来源 | footer `Total usage est: N Premium request(s)`；或 JSON `usage.premiumRequests` |
| 超限行为 | 评论并停止接力，请人类确认 |

注意：这是**软上限**——CLI 跑完才知道用量，无法像 `--max-turns` 那样中途硬停。需要硬上限时，只能靠 `maxWallClockMinutes` + 外层 `timeout`。

### 9.2 时间

沿用 `TEAM[].maxWallClockMinutes`，由 `run-agent.mjs` 的进程超时执行：

- PM / OCR：15 分钟
- Java / React：25 分钟
- QA：35 分钟

### 9.3 轮数

Copilot CLI 没有 `--max-turns`。本次改造：

- 删除对 `maxTurns` 的依赖（字段保留，不传 CLI）。
- 用时间 + premium request 预算作为主要约束。
- 接力上限（`.npc/issue-<n>/handoff.json`，20 次）不变。

---

## 10. 输出解析

### 10.1 默认：文本 + footer

不加 `-s`，stdout 形如：

```text
... agent 最终回答 ...
NEXT:npc-pm

Total usage est: 3 Premium request(s)
  claude-sonnet-4.6  41.3k in, 220 out, 13.1k cached
Total session time: 12m 3s
Total code changes: +120 -8
```

解析：

- `premiumRequests`：正则 `Total usage est:\s*([\d.]+)\s*Premium request`;
- `text`：去掉 footer 段，保留 agent 回答；
- `parseNext(text)` 取最后一行 `NEXT:`。

### 10.2 可选：`--output-format json`

如果 runner 上的 `copilot --help` 支持：

- 设置仓库变量 `COPILOT_OUTPUT_FORMAT=json`；
- 解析 JSON 的 `result` / `usage.premiumRequests`；
- 如果 flag 不存在，CLI 会报错；此时改回 `text`。

### 10.3 用量解析不到

- 不要假装 0；timing 写 `premiumRequests: null`。
- 日志输出警告。
- 继续执行（否则试点第一天就会因为格式差异卡住）。
- 后续通过 `events.jsonl` / OTel 补精确统计。

---

## 11. 兼容与回滚

### 11.1 运行时开关

```text
NPC_RUNTIME=copilot  → 新路径
NPC_RUNTIME=claude   → 原路径（默认）
```

bmw.ghe.com 仓库变量：

```text
NPC_RUNTIME=copilot
NPC_GITHUB_HOST=bmw.ghe.com
COPILOT_MODEL=<企业允许的模型>
COPILOT_BUDGET_PREMIUM_REQUESTS=250
```

github.com/br-ai-lab 不设置这些变量，继续走 Claude。

### 11.2 回滚步骤

1. bmw.ghe.com 仓库变量 `NPC_RUNTIME` 改为 `claude`（或删除）。
2. 确认 Claude 相关 Secret 已配置：`CLAUDE_CODE_OAUTH_TOKEN` 或 `ANTHROPIC_*`。
3. 重新运行 workflow。
4. 不需要回滚代码；两条路径都保留。

---

## 12. 与原始 plan 的差异

| plan 约束 | 本方案 | 处理 |
|---|---|---|
| 技术栈 `Claude Code CLI` | 增加 Copilot CLI，默认仍 Claude | 本文件作为 plan 修订记录 |
| 认证二选一 `CLAUDE_CODE_OAUTH_TOKEN` / `ANTHROPIC_*` | 增加 `COPILOT_GITHUB_TOKEN` + `GH_HOST` | 本文件记录 |
| 单次运行 `$10` | 改为 250 premium requests（≈$10） | 需发起人确认换算口径 |
| 脚本不引入运行时依赖 | 保持（CLI 全局安装，不 import SDK） | 满足 |
| `claude -p ...` | copilot 路径新增 `copilot -p ...` | 两条路径并存 |
| Action 安装 Claude Code | 按 runtime 二选一安装 | 满足回滚 |
| verifier 检查 `claude-token` | 改为检查 `copilot-token`/`github-host` | 实施时修改 |
| setup/runbook 的 token 说明 | 新增 Copilot 手册 | 实施时新增 |
| `--max-turns` | CLI 没有等价物 | 用时间/预算替代，plan 需注明 |
| `--append-system-prompt` | 用 custom agent 等价 | 满足 |
| `--allowedTools` | 翻译成 `--allow-tool` | 满足 |

结论：**功能与验收目标可以满足；plan 的技术栈、认证和预算口径需要修订。**

---

## 13. 测试计划

### 13.1 单元测试

```bash
npm test
```

覆盖：

- 工具翻译、参数构建、输出解析、认证校验、agent 文件生成；
- 现有 mention/gate/next/team/prompts/ensure-branch-pr/verify-config 测试。

### 13.2 本地静态检查

```bash
node scripts/verify-config.mjs
```

预期：`config ok`。

### 13.3 bmw.ghe.com 冒烟测试

1. 建一个测试 Issue，加 `npc-work-mode` 标签，评论 `@npc-pm 请开始`。
2. 观察：
   - Action 日志出现 `GitHub Copilot CLI` 安装成功；
   - `GH_HOST=bmw.ghe.com`；
   - `copilot -p ...` 正常退出；
   - PM 评论身份是 `npc-pm[bot]`；
   - 分支和 draft PR 创建；
   - `NEXT:npc-java` 触发。
3. 检查 `npc-timing.json` 里的 `premiumRequests` / `runtime`。

### 13.4 失败路径

- 不配 `COPILOT_GITHUB_TOKEN`：runner 报 `missing auth: set COPILOT_GITHUB_TOKEN`。
- token 来自 github.com：CLI 认证失败，日志提示 host 不匹配。
- 不配 `GH_HOST`：出现 “none of the git remotes point to a known GitHub host”。
- 组织策略未开 CLI：403。
- 模型名不在策略里：CLI 报模型不可用，换 `COPILOT_MODEL`。
- premium request 超限：评论停止接力。

---

## 14. 风险与待验证

| 风险 | 影响 | 缓解 |
|---|---|---|
| bmw.ghe.com 的 Copilot CLI 策略/端点与 github.com 有差异 | 认证失败 | 先跑冒烟测试；保留 Claude 回退 |
| fine-grained PAT 在 GHE.com 上不可用或权限名不同 | 无法认证 | 改用 GitHub App installation token 或企业管理员确认 |
| `--output-format json` 版本差异 | 解析失败 | 默认 text + footer；JSON 可选 |
| premium request 实际计费不是 $0.04 | 预算口径不准 | 以企业合同为准；变量可调 |
| CLI 无 `--max-turns` | 单次运行可能过长 | `maxWallClockMinutes` + 外层 timeout |
| 工具白名单不完整 | CLI 停下来等授权 | 看日志补 `--allow-tool`；不用 `--yolo` |
| 非 Anthropic 模型工具调用质量 | NPC 表现下降 | 先用企业推荐模型跑通，再评估 |

---

## 15. 验收标准

- [ ] `npm test` 全绿。
- [ ] `node scripts/verify-config.mjs` 输出 `config ok`。
- [ ] bmw.ghe.com 上 `NPC_RUNTIME=copilot` 时，PM/Java 两个角色能完成一次接力。
- [ ] 评论身份、分支、draft PR、`NEXT:` 与 Claude 路径一致。
- [ ] `npc-timing.json` 包含 `runtime: "copilot"` 和 premium requests（或明确 null）。
- [ ] 不配 token 时快速失败，错误信息清晰。
- [ ] 把 `NPC_RUNTIME` 改回 `claude` 后，旧路径仍可运行。
- [ ] 原 github.com 部署不受影响（变量未设置时默认 Claude）。

---

## 16. 实施顺序

1. 新增 `scripts/copilot.mjs` + `tests/copilot.test.mjs`。
2. 修改 `scripts/run-agent.mjs`、`scripts/timing.mjs`。
3. 修改 `.github/actions/npc-agent/action.yml`。
4. 修改 5 个 workflow。
5. 修改 `scripts/verify-config.mjs`。
6. 更新测试并跑 `npm test` + `verify-config`。
7. 新增 `docs/setup-copilot-cli.md`，在 `docs/setup.md` 顶部加链接。
8. bmw.ghe.com 冒烟测试 → Stage 1 验收。
9. 记录结果；如失败，按第 11 节回滚。
