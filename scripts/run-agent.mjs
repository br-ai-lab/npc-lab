import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { getRole } from "./team.mjs";
import { parseNext } from "./next.mjs";

const HANDOFF_LIMIT = 20;
const COST_LIMIT_USD = 10;

export function buildUserPrompt({ issue, branch, triggerComment }) {
  return [
    `你正在处理 issue #${issue}，工作分支是 ${branch}。`,
    "",
    "触发评论：",
    String(triggerComment ?? "").trim() || "（没有触发评论文本，请直接读 Issue）",
    "",
    `请先用 \`gh issue view ${issue} --comments\` 读完整 Issue，然后按你的角色 prompt 执行。`,
    `完成任务后，用 \`gh issue comment ${issue} --body "..."\` 发评论。`,
    "最后一行必须是 `NEXT:<role>` 或 `NEXT:none`。",
  ].join("\n");
}

export function parseAgentOutput(stdout) {
  try {
    const data = JSON.parse(String(stdout ?? "").trim());
    return {
      text: String(data.result ?? ""),
      costUsd: Number(data.total_cost_usd ?? 0),
    };
  } catch {
    return { text: String(stdout ?? ""), costUsd: 0 };
  }
}

export async function resolveNext({ text, issue, roleSlug, run }) {
  const stdoutNext = parseNext(text);
  if (stdoutNext.roles.length > 0) return stdoutNext;

  try {
    const raw = await run(`gh api repos/$GITHUB_REPOSITORY/issues/${issue}/comments?per_page=100`);
    const comments = JSON.parse(String(raw ?? "[]"));
    const login = `${roleSlug}[bot]`;
    const mine = comments.filter((comment) => comment?.user?.login === login);
    const body = mine.at(-1)?.body;
    if (body) {
      const commentNext = parseNext(body);
      if (!commentNext.error) return commentNext;
    }
  } catch (error) {
    console.error(`comment NEXT lookup failed: ${error.message}`);
  }

  return stdoutNext;
}

const AUTH_ENV_KEYS = [
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
  "CLAUDE_CODE_OAUTH_TOKEN",
];

export function buildAgentEnv(baseEnv = process.env) {
  const env = { ...baseEnv };
  for (const key of AUTH_ENV_KEYS) {
    if (!env[key] || String(env[key]).trim() === "") delete env[key];
  }

  if (!env.ANTHROPIC_AUTH_TOKEN && !env.CLAUDE_CODE_OAUTH_TOKEN) {
    throw new Error("missing auth: set ANTHROPIC_AUTH_TOKEN or CLAUDE_CODE_OAUTH_TOKEN");
  }
  if (env.ANTHROPIC_AUTH_TOKEN && !env.ANTHROPIC_BASE_URL) {
    console.warn("ANTHROPIC_AUTH_TOKEN is set without ANTHROPIC_BASE_URL; using the default endpoint");
  }

  return env;
}

export async function dispatchNext({ role, issue, branch, run }) {
  const target = typeof role === "string" ? getRole(role) : role;
  if (!target) throw new Error(`unknown role: ${String(role)}`);

  const runner =
    run ??
    ((cmd) =>
      execSync(cmd, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "inherit"],
      }));

  await runner(
    `gh api repos/$GITHUB_REPOSITORY/dispatches -f event_type=${target.eventType} -f client_payload[issue]=${issue} -f client_payload[branch]=${branch}`,
  );
}

function readHandoff(issue) {
  const path = `.npc/issue-${issue}/handoff.json`;
  if (!existsSync(path)) return { count: 0 };
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { count: 0 };
  }
}

function writeHandoff(issue, count) {
  const dir = `.npc/issue-${issue}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/handoff.json`, `${JSON.stringify({ count }, null, 2)}\n`, "utf8");
}

export function handoffCommands({ issue, branch, count }) {
  return [
    `git pull --rebase origin ${branch}`,
    `git add .npc/issue-${issue}/handoff.json`,
    `git commit -m "chore: handoff ${count} for issue ${issue}"`,
    "git push",
  ];
}

function run(cmd) {
  return execSync(cmd, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}

function runClaude(args, env) {
  return new Promise((resolve) => {
    const child = spawn("claude", args, { env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });
    child.on("error", (error) => resolve({ stdout, stderr, status: 1, error }));
    child.on("close", (status) => resolve({ stdout, stderr, status: status ?? 1 }));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const issue = process.env.ISSUE_NUMBER;
  const branch = process.env.BRANCH;
  const rolePromptPath = process.env.ROLE_PROMPT;
  const allowedTools = process.env.ALLOWED_TOOLS || "Bash,Read,Write,Edit,Glob,Grep";
  const owner = process.env.GITHUB_REPOSITORY_OWNER || "owner";

  if (!issue || !branch || !rolePromptPath) {
    console.error("ISSUE_NUMBER, BRANCH, and ROLE_PROMPT are required");
    process.exit(2);
  }

  const handoff = readHandoff(issue);
  if (handoff.count >= HANDOFF_LIMIT) {
    run(`gh issue comment ${issue} --body "@${owner} 已达到接力上限（${HANDOFF_LIMIT} 次），请人工介入。"`);
    process.exit(0);
  }

  const rolePrompt = readFileSync(rolePromptPath, "utf8");
  const userPrompt = buildUserPrompt({
    issue,
    branch,
    triggerComment: process.env.TRIGGER_COMMENT ?? "",
  });

  const result = await runClaude(
    [
      "-p",
      userPrompt,
      "--append-system-prompt",
      rolePrompt,
      "--allowedTools",
      allowedTools,
      "--permission-mode",
      "acceptEdits",
      "--max-turns",
      "60",
      "--output-format",
      "json",
    ],
    buildAgentEnv(process.env),
  );

  const stdout = result.stdout ?? "";
  writeFileSync("agent-output.txt", stdout, "utf8");

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`claude exited with status ${result.status}`);
    process.exit(1);
  }

  const { text, costUsd } = parseAgentOutput(stdout);
  console.log(`agent cost: $${costUsd.toFixed(4)}`);

  writeHandoff(issue, handoff.count + 1);
  try {
    for (const command of handoffCommands({ issue, branch, count: handoff.count + 1 })) {
      run(command);
    }
  } catch (error) {
    try {
      run(`git pull --rebase origin ${branch}`);
      run("git push");
    } catch (retryError) {
      console.error(`handoff commit skipped: ${retryError.message}`);
    }
  }

  if (costUsd > COST_LIMIT_USD) {
    run(`gh issue comment ${issue} --body "@${owner} 已达到成本上限（$${costUsd.toFixed(2)}），请人工确认。"`);
    process.exit(0);
  }

  const next = await resolveNext({
    text,
    issue,
    roleSlug: process.env.ROLE_SLUG || "npc-pm",
    run,
  });
  if (next.error) {
    console.error(`NEXT parse error: ${next.error}`);
    process.exit(0);
  }
  if (next.roles.length === 0) {
    console.log("NEXT:none — chain stops");
    process.exit(0);
  }

  for (const role of next.roles) {
    await dispatchNext({ role, issue, branch, run });
    console.log(`dispatched ${role}`);
  }
}
