import test from "node:test";
import assert from "node:assert/strict";
import { buildUserPrompt, parseAgentOutput } from "../scripts/run-agent.mjs";

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
