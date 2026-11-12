import { roleSlugs } from "./team.mjs";

const MAX_NEXT_ROLES = 3;

export function parseNext(output) {
  const lines = String(output ?? "").replace(/\r\n?/g, "\n").split("\n");
  let value = null;

  for (const line of lines) {
    const match = line.trim().match(/^NEXT:\s*(.*)$/);
    if (match) value = match[1].trim();
  }

  if (value === null) return { roles: [], error: "missing-next" };
  if (value.toLowerCase() === "none") return { roles: [] };

  const roles = [
    ...new Set(
      value
        .split(",")
        .map((role) => role.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  if (roles.length === 0) return { roles: [], error: "missing-next" };
  if (roles.length > MAX_NEXT_ROLES) return { roles: [], error: "too-many-roles" };
  if (!roles.every((role) => roleSlugs().includes(role))) {
    return { roles: [], error: "unknown-role" };
  }

  return { roles };
}
