import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_COPILOT_MODEL = "claude-sonnet-4.5";
export const DEFAULT_PREMIUM_REQUEST_BUDGET = 250;
export const DEFAULT_AGENT_TOOLS = ["read", "edit", "search", "execute", "skill"];

export const DEFAULT_DENY_TOOLS = [
  "shell(rm)",
  "shell(sudo)",
  "shell(shutdown)",
  "shell(reboot)",
  "shell(mkfs)",
  "shell(dd)",
];

const AUTH_ENV_KEYS = [
  "COPILOT_GITHUB_TOKEN",
  "GH_HOST",
  "COPILOT_MODEL",
  "COPILOT_OUTPUT_FORMAT",
  "COPILOT_BUDGET_PREMIUM_REQUESTS",
  "NPC_RUNTIME",
];

export function normalizeHost(host) {
  if (!host) return "";
  return String(host)
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");
}

export function translateAllowedTools(allowedTools = "") {
  const shell = [];
  const tools = new Set(["read", "edit", "search", "execute", "skill"]);
  let write = false;

  for (const raw of String(allowedTools).split(",")) {
    const token = raw.trim();
    if (!token) continue;

    const bash = token.match(/^Bash\((.*)\)$/i);
    if (bash) {
      const command = bash[1].trim();
      if (command && command !== "*") shell.push(command);
      if (command === "*") shell.push("*");
      continue;
    }

    switch (token.toLowerCase()) {
      case "read":
        tools.add("read");
        break;
      case "write":
      case "edit":
        write = true;
        tools.add("edit");
        break;
      case "glob":
      case "grep":
        tools.add("search");
        break;
      case "webfetch":
      case "websearch":
        tools.add("web");
        break;
      default:
        break;
    }
  }

  return {
    shell: [...new Set(shell)],
    tools: [...tools],
    write,
  };
}

export function buildCopilotArgs({
  prompt,
  agentName,
  model = DEFAULT_COPILOT_MODEL,
  allowedTools = "",
  outputFormat = "text",
  silent = false,
  denyTools = DEFAULT_DENY_TOOLS,
}) {
  const { shell, write } = translateAllowedTools(allowedTools);
  const args = [
    "-p",
    String(prompt ?? ""),
    "--agent",
    String(agentName),
    "--model",
    String(model),
    "--no-ask-user",
  ];

  if (silent) args.push("-s");
  if (outputFormat === "json") args.push("--output-format", "json");

  for (const command of shell) {
    args.push(`--allow-tool=shell(${command})`);
  }
  if (write) args.push("--allow-tool=write");

  for (const command of denyTools) {
    args.push(`--deny-tool=${command}`);
  }

  return args;
}

export function buildCopilotEnv(baseEnv = process.env) {
  const env = { ...baseEnv };

  for (const key of AUTH_ENV_KEYS) {
    if (!env[key] || String(env[key]).trim() === "") delete env[key];
  }

  if (!env.COPILOT_GITHUB_TOKEN) {
    throw new Error("missing auth: set COPILOT_GITHUB_TOKEN");
  }

  if (env.GH_HOST) env.GH_HOST = normalizeHost(env.GH_HOST);

  return env;
}

export function premiumRequestBudget(baseEnv = process.env) {
  const raw = baseEnv.COPILOT_BUDGET_PREMIUM_REQUESTS;
  if (!raw) return DEFAULT_PREMIUM_REQUEST_BUDGET;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_PREMIUM_REQUEST_BUDGET;
}

export function parseCopilotOutput(stdout) {
  const raw = String(stdout ?? "").trim();
  if (!raw) return { text: "", premiumRequests: null, model: null };

  const fromObject = (data) => {
    if (!data || typeof data !== "object") return null;
    const text = typeof data.result === "string" ? data.result : data.text ?? data.content;
    if (typeof text !== "string") return null;

    const usage = data.usage && typeof data.usage === "object" ? data.usage : {};
    const premiumRequests =
      usage.premiumRequests ?? usage.totalPremiumRequests ?? data.totalPremiumRequests ?? data.premiumRequests;
    const model = usage.model ?? data.model ?? data.currentModel ?? null;

    return {
      text,
      premiumRequests: premiumRequests == null ? null : Number(premiumRequests),
      model: model == null ? null : String(model),
    };
  };

  const whole = tryParseJson(raw);
  if (Array.isArray(whole)) {
    for (let index = whole.length - 1; index >= 0; index -= 1) {
      const result = fromObject(whole[index]);
      if (result) return result;
    }
  }
  const wholeResult = fromObject(whole);
  if (wholeResult) return wholeResult;

  const lines = raw.split("\n");
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index].trim();
    if (!line.startsWith("{")) continue;
    const result = fromObject(tryParseJson(line));
    if (result) return result;
  }

  const premiumMatch = raw.match(/Total usage est:\s*([\d.]+)\s*Premium requests?/i);
  const premiumRequests = premiumMatch ? Number(premiumMatch[1]) : null;
  const modelMatch = raw.match(/^\s*([a-z0-9][a-z0-9._-]*)\s+[\d.]+k? in,/im);

  return {
    text: stripUsageFooter(raw),
    premiumRequests,
    model: modelMatch ? modelMatch[1] : null,
  };
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function stripUsageFooter(text) {
  const match = text.match(/\n\s*Total usage est:/i);
  return (match ? text.slice(0, match.index) : text).trim();
}

export function prepareCopilotAgent({ role, promptPath, model = DEFAULT_COPILOT_MODEL, dir }) {
  const slug = role?.slug ?? "npc-agent";
  const description = role?.name ?? slug;
  const prompt = readFileSync(promptPath, "utf8");
  const targetDir = dir ?? join(process.env.COPILOT_HOME || join(homedir(), ".copilot"), "agents");
  const targetPath = join(targetDir, `${slug}.agent.md`);

  mkdirSync(targetDir, { recursive: true });
  writeFileSync(
    targetPath,
    [
      "---",
      `name: ${slug}`,
      `description: ${JSON.stringify(description)}`,
      `tools: [${DEFAULT_AGENT_TOOLS.map((tool) => JSON.stringify(tool)).join(", ")}]`,
      `model: ${JSON.stringify(model)}`,
      "---",
      "",
      prompt.trim(),
      "",
    ].join("\n"),
    "utf8",
  );

  return targetPath;
}

export function summarizeCopilotRun({
  wallClockMs = 0,
  premiumRequests = null,
  model = null,
  budgetPremiumRequests = DEFAULT_PREMIUM_REQUEST_BUDGET,
} = {}) {
  return {
    runtime: "copilot",
    wallClockMs,
    model,
    premiumRequests: premiumRequests == null ? null : Number(premiumRequests),
    budgetPremiumRequests,
    costUsdApprox:
      premiumRequests == null ? null : Number((Number(premiumRequests) * 0.04).toFixed(4)),
    toolCalls: null,
    assistantTurns: null,
    tools: {},
    topTools: [],
  };
}
