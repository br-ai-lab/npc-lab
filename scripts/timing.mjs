export function summarizeEvents(events = []) {
  let first = null;
  let last = null;
  let assistantTurns = 0;
  let toolCalls = 0;
  let modelApiMs = 0;
  let costUsd = 0;
  const pending = new Map();
  const tools = {};

  for (const { t, event } of events) {
    if (!event) continue;
    if (first === null) first = t;
    last = t;

    if (event.type === "assistant") {
      assistantTurns += 1;
      for (const block of event.message?.content ?? []) {
        if (block?.type === "tool_use") {
          toolCalls += 1;
          pending.set(block.id, { name: block.name ?? "unknown", start: t });
        }
      }
    }

    if (event.type === "user") {
      for (const block of event.message?.content ?? []) {
        if (block?.type === "tool_result" && pending.has(block.tool_use_id)) {
          const { name, start } = pending.get(block.tool_use_id);
          pending.delete(block.tool_use_id);
          const stats = (tools[name] ??= { calls: 0, totalMs: 0 });
          stats.calls += 1;
          stats.totalMs += t - start;
        }
      }
    }

    if (event.type === "result") {
      modelApiMs = Number(event.duration_api_ms ?? 0);
      costUsd = Number(event.total_cost_usd ?? 0);
    }
  }

  const topTools = Object.entries(tools)
    .sort((a, b) => b[1].totalMs - a[1].totalMs)
    .slice(0, 5)
    .map(([name, stats]) => ({ name, ...stats }));

  return {
    wallClockMs: first === null ? 0 : last - first,
    modelApiMs,
    costUsd,
    assistantTurns,
    toolCalls,
    tools,
    topTools,
  };
}
