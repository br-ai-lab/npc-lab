import { roleSlugs } from "./team.mjs";

export function parseNext(output) {
  const lines = String(output ?? "").replace(/\r\n?/g, "\n").split("\n");
  let next = null;

  for (const line of lines) {
    const match = line.trim().match(/^NEXT:(\S+)$/);
    if (match) next = match[1].toLowerCase();
  }

  if (next === null) return { role: null, error: "missing-next" };
  if (next === "none") return { role: null };
  if (!roleSlugs().includes(next)) return { role: null, error: "unknown-role" };
  return { role: next };
}
