import test from "node:test";
import assert from "node:assert/strict";
import { buildAgentEnv, buildUserPrompt, parseAgentOutput } from "../scripts/run-agent.mjs";

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
