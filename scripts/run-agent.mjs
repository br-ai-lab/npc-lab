import { execFileSync, execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { getRole } from "./team.mjs";
import { parseNext } from "./next.mjs";
import { summarizeEvents } from "./timing.mjs";
import {
  DEFAULT_COPILOT_MODEL,
  buildCopilotArgs,
  buildCopilotEnv,
  parseCopilotOutput,
  prepareCopilotAgent,
  premiumRequestBudget,
  summarizeCopilotRun,
} from "./copilot.mjs";

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
  const raw = String(stdout ?? "").trim();

  try {
    const data = JSON.parse(raw);
    return {
      text: String(data.result ?? ""),
      costUsd: Number(data.total_cost_usd ?? 0),
    };
  } catch {
    // stream-json: one JSON object per line; use the last result event.
    const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      try {
        const data = JSON.parse(lines[index]);
        if (data && typeof data === "object" && ("result" in data || data.type === "result")) {
          return {
            text: String(data.result ?? ""),
            costUsd: Number(data.total_cost_usd ?? 0),
          };
        }
      } catch {
        // ignore non-JSON lines
      }
    }
    return { text: raw, costUsd: 0 };
  }
}

export function budgetForRole(roleSlug) {
  const role = getRole(roleSlug);
  return {
    maxTurns: role?.maxTurns ?? 40,
    maxWallClockMinutes: role?.maxWallClockMinutes ?? 30,
  };
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

export function buildAgentEnv(baseEnv = process.env, runtime = "claude") {
  if (runtime === "copilot") return buildCopilotEnv(baseEnv);

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
    `git pull --rebase --autostash origin ${branch}`,
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

function ghIssueComment(issue, body) {
  execFileSync("gh", ["issue", "comment", String(issue), "--body", body], {
    stdio: "inherit",
  });
}

function runClaude(args, env, timeoutMs) {
  return runProcess("claude", args, env, timeoutMs);
}

function runCopilot(args, env, timeoutMs) {
  return runProcess("copilot", args, env, timeoutMs);
}

function runProcess(command, args, env, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });
    let stdout = "";
    let stderr = "";
    let buffer = "";
    let timedOut = false;
    const events = [];

    const recordLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        events.push({ t: Date.now(), event: JSON.parse(trimmed) });
      } catch {
        // ignore non-JSON lines
      }
    };

    const killGroup = (signal) => {
      try {
        process.kill(-child.pid, signal);
      } catch {
        try {
          child.kill(signal);
        } catch {
          // already gone
        }
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      killGroup("SIGTERM");
      setTimeout(() => killGroup("SIGKILL"), 5000).unref();
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      process.stdout.write(chunk);
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        recordLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      recordLine(buffer);
      resolve({ stdout, stderr, status: 1, error, timedOut, events });
    });
    child.on("close", (status) => {
      clearTimeout(timer);
      recordLine(buffer);
      resolve({ stdout, stderr, status: status ?? 1, timedOut, events });
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const issue = process.env.ISSUE_NUMBER;
  const branch = process.env.BRANCH;
  const rolePromptPath = process.env.ROLE_PROMPT;
  const allowedTools = process.env.ALLOWED_TOOLS || "Bash,Read,Write,Edit,Glob,Grep";
  const owner = process.env.GITHUB_REPOSITORY_OWNER || "owner";
  const roleSlug = process.env.ROLE_SLUG || "npc-pm";
  const budget = budgetForRole(roleSlug);

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

  const runtime = process.env.NPC_RUNTIME || "claude";
  const startedAt = Date.now();
  let result;
  let text;
  let costUsd = 0;
  let premiumRequests = null;
  let model = null;
  let timing;

  if (runtime === "copilot") {
    const copilotModel = process.env.COPILOT_MODEL || DEFAULT_COPILOT_MODEL;
    model = copilotModel;

    prepareCopilotAgent({
      role: getRole(roleSlug) ?? { slug: roleSlug, name: roleSlug },
      promptPath: rolePromptPath,
      model: copilotModel,
    });

    result = await runCopilot(
      buildCopilotArgs({
        prompt: userPrompt,
        agentName: roleSlug,
        model: copilotModel,
        allowedTools,
        outputFormat: process.env.COPILOT_OUTPUT_FORMAT || "text",
      }),
      buildAgentEnv(process.env, "copilot"),
      budget.maxWallClockMinutes * 60 * 1000,
    );

    const parsed = parseCopilotOutput(result.stdout);
    if (parsed.premiumRequests == null && result.stderr) {
      const stderrUsage = parseCopilotOutput(result.stderr);
      if (stderrUsage.premiumRequests != null) parsed.premiumRequests = stderrUsage.premiumRequests;
    }
    text = parsed.text;
    premiumRequests = parsed.premiumRequests;
    model = parsed.model || copilotModel;

    timing = summarizeCopilotRun({
      wallClockMs: Date.now() - startedAt,
      premiumRequests,
      model,
      budgetPremiumRequests: premiumRequestBudget(process.env),
    });
  } else {
    result = await runClaude(
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
        String(budget.maxTurns),
        "--output-format",
        "stream-json",
        "--verbose",
      ],
      buildAgentEnv(process.env),
      budget.maxWallClockMinutes * 60 * 1000,
    );

    const parsed = parseAgentOutput(result.stdout);
    text = parsed.text;
    costUsd = parsed.costUsd;
    timing = summarizeEvents(result.events ?? []);
  }

  const stdout = result.stdout ?? "";
  writeFileSync("agent-output.txt", stdout, "utf8");
  writeFileSync("npc-timing.json", `${JSON.stringify(timing, null, 2)}\n`, "utf8");

  if (runtime === "copilot") {
    console.log(
      `npc timing: runtime=copilot wall=${(timing.wallClockMs / 1000).toFixed(1)}s ` +
        `premiumRequests=${timing.premiumRequests ?? "unknown"} model=${timing.model ?? "unknown"}`,
    );
  } else {
    console.log(
      `npc timing: wall=${(timing.wallClockMs / 1000).toFixed(1)}s ` +
        `model=${(timing.modelApiMs / 1000).toFixed(1)}s ` +
        `tools=${timing.toolCalls} top=${timing.topTools
          .map((tool) => `${tool.name}:${(tool.totalMs / 1000).toFixed(1)}s`)
          .join(",")}`,
    );
  }

  if (result.timedOut) {
    const message =
      roleSlug === "npc-pm"
        ? `@${owner} 项目经理超过 ${budget.maxWallClockMinutes} 分钟时间预算，已停止，请人工介入。`
        : `@npc-pm ${roleSlug} 超过 ${budget.maxWallClockMinutes} 分钟时间预算，已停止；请拆分任务或调整策略。`;
    try {
      ghIssueComment(issue, message);
    } catch (error) {
      console.error(`timeout comment failed: ${error.message}`);
    }
    if (roleSlug !== "npc-pm") {
      await dispatchNext({ role: "npc-pm", issue, branch, run });
    }
    process.exit(0);
  }

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`${runtime === "copilot" ? "copilot" : "claude"} exited with status ${result.status}`);
    process.exit(1);
  }

  if (runtime === "copilot") {
    if (premiumRequests == null) {
      console.warn("copilot usage not found in output; premium request budget cannot be enforced");
    } else {
      console.log(`agent premium requests: ${premiumRequests}`);
    }
  } else {
    console.log(`agent cost: $${costUsd.toFixed(4)}`);
  }

  writeHandoff(issue, handoff.count + 1);
  try {
    for (const command of handoffCommands({ issue, branch, count: handoff.count + 1 })) {
      run(command);
    }
  } catch (error) {
    try {
      run(`git pull --rebase --autostash origin ${branch}`);
      run("git push");
    } catch (retryError) {
      console.error(`handoff commit skipped: ${retryError.message}`);
    }
  }

  const copilotBudget = premiumRequestBudget(process.env);
  if (runtime === "copilot") {
    if (premiumRequests != null && premiumRequests > copilotBudget) {
      run(
        `gh issue comment ${issue} --body "@${owner} 已达到 Copilot 预算上限（${premiumRequests} premium requests，上限 ${copilotBudget}），请人工确认。"`,
      );
      process.exit(0);
    }
  } else if (costUsd > COST_LIMIT_USD) {
    run(`gh issue comment ${issue} --body "@${owner} 已达到成本上限（$${costUsd.toFixed(2)}），请人工确认。"`);
    process.exit(0);
  }

  const next = await resolveNext({
    text,
    issue,
    roleSlug,
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
