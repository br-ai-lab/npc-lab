import test from "node:test";
import assert from "node:assert/strict";
import { summarizeEvents } from "../scripts/timing.mjs";

test("summarizes turns, tools, and timing", () => {
  const events = [
    {
      t: 1000,
      event: {
        type: "assistant",
        message: { content: [{ type: "tool_use", id: "t1", name: "Bash" }] },
      },
    },
    {
      t: 4000,
      event: {
        type: "user",
        message: { content: [{ type: "tool_result", tool_use_id: "t1" }] },
      },
    },
    {
      t: 5000,
      event: { type: "result", duration_api_ms: 3000, total_cost_usd: 0.12 },
    },
  ];

  const timing = summarizeEvents(events);
  assert.equal(timing.wallClockMs, 4000);
  assert.equal(timing.modelApiMs, 3000);
  assert.equal(timing.toolCalls, 1);
  assert.deepEqual(timing.tools.Bash, { calls: 1, totalMs: 3000 });
});

test("returns zeros for no events", () => {
  assert.deepEqual(summarizeEvents([]), {
    wallClockMs: 0,
    modelApiMs: 0,
    costUsd: 0,
    assistantTurns: 0,
    toolCalls: 0,
    tools: {},
    topTools: [],
  });
});
