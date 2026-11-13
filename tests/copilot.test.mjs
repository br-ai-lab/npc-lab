import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildCopilotArgs,
  buildCopilotEnv,
  parseCopilotOutput,
  premiumRequestBudget,
  prepareCopilotAgent,
  summarizeCopilotRun,
  translateAllowedTools,
} from "../scripts/copilot.mjs";

test("translates Claude-style allowed tools to Copilot flags", () => {
  const result = translateAllowedTools("Bash(git:*),Bash(gh:*),Read,Write,Edit,Glob,Grep");
  assert.deepEqual(result.shell, ["git:*", "gh:*"]);
  assert.equal(result.write, true);
  assert.deepEqual(result.tools, ["read", "edit", "search", "execute", "skill"]);
});

test("builds copilot args with agent, model, allow and deny lists", () => {
  const args = buildCopilotArgs({
    prompt: "do the work",
    agentName: "npc-pm",
    model: "claude-sonnet-4.5",
    allowedTools: "Bash(git:*),Write",
  });

  assert.equal(args[0], "-p");
  assert.equal(args[1], "do the work");
  assert.ok(args.includes("--agent"));
  assert.ok(args.includes("npc-pm"));
  assert.ok(args.includes("--model"));
  assert.ok(args.includes("claude-sonnet-4.5"));
  assert.ok(args.includes("--no-ask-user"));
  assert.ok(args.includes("--allow-tool=shell(git:*)"));
  assert.ok(args.includes("--allow-tool=write"));
  assert.ok(args.includes("--deny-tool=shell(rm)"));
  assert.equal(args.filter((arg) => arg.startsWith("--allow-tool=")).length, 2);
});

test("parses a JSON result with premium requests", () => {
  const stdout = JSON.stringify({
    type: "result",
    result: "done\nNEXT:npc-pm",
    usage: { premiumRequests: 3, model: "claude-sonnet-4.5" },
  });
  assert.deepEqual(parseCopilotOutput(stdout), {
    text: "done\nNEXT:npc-pm",
    premiumRequests: 3,
    model: "claude-sonnet-4.5",
  });
});

test("parses the last JSON result line", () => {
  const stdout = [
    JSON.stringify({ type: "log", message: "starting" }),
    JSON.stringify({ type: "result", result: "done\nNEXT:npc-java", usage: { premiumRequests: 2 } }),
  ].join("\n");
  assert.deepEqual(parseCopilotOutput(stdout), {
    text: "done\nNEXT:npc-java",
    premiumRequests: 2,
    model: null,
  });
});

test("parses plain text and the usage footer", () => {
  const stdout =
    "done\nNEXT:npc-pm\n\nTotal usage est: 3 Premium request(s)\n  claude-sonnet-4.6  1.2k in, 20 out\n";
  const parsed = parseCopilotOutput(stdout);
  assert.equal(parsed.text, "done\nNEXT:npc-pm");
  assert.equal(parsed.premiumRequests, 3);
  assert.equal(parsed.model, "claude-sonnet-4.6");
});

test("requires COPILOT_GITHUB_TOKEN and normalizes GH_HOST", () => {
  assert.throws(() => buildCopilotEnv({ COPILOT_GITHUB_TOKEN: "" }), /COPILOT_GITHUB_TOKEN/);

  const env = buildCopilotEnv({
    COPILOT_GITHUB_TOKEN: "token",
    GH_HOST: "https://bmw.ghe.com/",
    COPILOT_MODEL: "",
  });
  assert.equal(env.COPILOT_GITHUB_TOKEN, "token");
  assert.equal(env.GH_HOST, "bmw.ghe.com");
  assert.equal(env.COPILOT_MODEL, undefined);
});

test("clamps the premium request budget to a positive number", () => {
  assert.equal(premiumRequestBudget({}), 250);
  assert.equal(premiumRequestBudget({ COPILOT_BUDGET_PREMIUM_REQUESTS: "50" }), 50);
  assert.equal(premiumRequestBudget({ COPILOT_BUDGET_PREMIUM_REQUESTS: "nope" }), 250);
});

test("writes a Copilot custom agent with frontmatter", () => {
  const dir = mkdtempSync(join(tmpdir(), "npc-copilot-"));
  const promptPath = join(dir, "pm.md");
  const agentDir = join(dir, "agents");
  writeFileSync(promptPath, "# 项目经理\n\n负责拆任务。\n", "utf8");

  try {
    const target = prepareCopilotAgent({
      role: { slug: "npc-pm", name: "项目经理" },
      promptPath,
      model: "claude-sonnet-4.5",
      dir: agentDir,
    });
    const text = readFileSync(target, "utf8");
    assert.match(text, /^---\n/);
    assert.match(text, /name: npc-pm/);
    assert.match(text, /tools: \["read", "edit", "search", "execute", "skill"\]/);
    assert.match(text, /model: "claude-sonnet-4.5"/);
    assert.match(text, /# 项目经理/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("summarizes copilot usage", () => {
  const timing = summarizeCopilotRun({
    wallClockMs: 1000,
    premiumRequests: 3,
    model: "claude-sonnet-4.5",
    budgetPremiumRequests: 250,
  });
  assert.equal(timing.runtime, "copilot");
  assert.equal(timing.premiumRequests, 3);
  assert.equal(timing.costUsdApprox, 0.12);
  assert.equal(timing.budgetPremiumRequests, 250);
});
