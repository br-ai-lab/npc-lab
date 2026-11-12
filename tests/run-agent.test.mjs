import test from "node:test";
import assert from "node:assert/strict";
import { buildAgentEnv, buildUserPrompt, handoffCommands, parseAgentOutput, resolveNext } from "../scripts/run-agent.mjs";

test("user prompt includes issue, branch, and trigger", () => {
  const text = buildUserPrompt({ issue: 4, branch: "ai-npcs/issue-4", triggerComment: "@npc-pm 请开始" });
  assert.match(text, /issue #4/);
  assert.match(text, /ai-npcs\/issue-4/);
  assert.match(text, /@npc-pm 请开始/);
  assert.match(text, /NEXT:/);
});

test("parses the JSON result and cost", () => {
  const stdout = JSON.stringify({ result: "done\nNEXT:npc-pm", total_cost_usd: 0.42 });
  assert.deepEqual(parseAgentOutput(stdout), { text: "done\nNEXT:npc-pm", costUsd: 0.42 });
});

test("parses a stream-json result line", () => {
  const stdout = [
    JSON.stringify({ type: "system", subtype: "init" }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "working" }] } }),
    JSON.stringify({ type: "result", result: "done\nNEXT:npc-java", total_cost_usd: 0.12 }),
  ].join("\n");
  assert.deepEqual(parseAgentOutput(stdout), { text: "done\nNEXT:npc-java", costUsd: 0.12 });
});

test("drops empty auth env vars and keeps the provided one", () => {
  const env = buildAgentEnv({
    ANTHROPIC_AUTH_TOKEN: "",
    ANTHROPIC_BASE_URL: "",
    CLAUDE_CODE_OAUTH_TOKEN: "oauth-token",
  });
  assert.equal(env.ANTHROPIC_AUTH_TOKEN, undefined);
  assert.equal(env.ANTHROPIC_BASE_URL, undefined);
  assert.equal(env.CLAUDE_CODE_OAUTH_TOKEN, "oauth-token");
});

test("keeps an anthropic auth token and base url", () => {
  const env = buildAgentEnv({
    ANTHROPIC_AUTH_TOKEN: "gateway-token",
    ANTHROPIC_BASE_URL: "https://gateway.example",
  });
  assert.equal(env.ANTHROPIC_AUTH_TOKEN, "gateway-token");
  assert.equal(env.ANTHROPIC_BASE_URL, "https://gateway.example");
});

test("requires one auth credential", () => {
  assert.throws(() => buildAgentEnv({}), /auth/i);
});

test("handoff commands pull before push", () => {
  const commands = handoffCommands({ issue: 5, branch: "ai-npcs/issue-5", count: 2 });
  assert.match(commands[0], /git pull --rebase/);
  assert.ok(commands.includes("git push"));
  assert.ok(commands.findIndex((c) => c.includes("git pull --rebase")) < commands.indexOf("git push"));
});

test("uses stdout NEXT when present", async () => {
  let called = false;
  const result = await resolveNext({
    text: "done\nNEXT:npc-java",
    issue: 5,
    roleSlug: "npc-pm",
    run: async () => {
      called = true;
      return "[]";
    },
  });
  assert.deepEqual(result, { roles: ["npc-java"] });
  assert.equal(called, false);
});

test("falls back to the latest role comment", async () => {
  const comments = JSON.stringify([
    { user: { login: "npc-pm[bot]" }, body: "work order\nNEXT:npc-java,npc-react" },
  ]);
  const result = await resolveNext({
    text: "posted",
    issue: 5,
    roleSlug: "npc-pm",
    run: async () => comments,
  });
  assert.deepEqual(result, { roles: ["npc-java", "npc-react"] });
});

test("prefers the comment when stdout says NEXT:none", async () => {
  const comments = JSON.stringify([
    { user: { login: "npc-pm[bot]" }, body: "work order\nNEXT:npc-java" },
  ]);
  const result = await resolveNext({
    text: "posted\nNEXT:none",
    issue: 5,
    roleSlug: "npc-pm",
    run: async () => comments,
  });
  assert.deepEqual(result, { roles: ["npc-java"] });
});

test("returns missing-next when neither stdout nor comment has NEXT", async () => {
  const result = await resolveNext({
    text: "posted",
    issue: 5,
    roleSlug: "npc-pm",
    run: async () => "[]",
  });
  assert.deepEqual(result, { roles: [], error: "missing-next" });
});
