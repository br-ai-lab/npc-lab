import { pathToFileURL } from "node:url";
import { extractMentions } from "./mention.mjs";

const WRITE_ROLES = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const WORK_MODE_LABEL = "npc-work-mode";

export function canStart({ authorAssociation, labels = [], body = "" }) {
  if (!WRITE_ROLES.has(authorAssociation)) {
    return { ok: false, reason: "forbidden-actor" };
  }
  if (!labels.includes(WORK_MODE_LABEL)) {
    return { ok: false, reason: "missing-label" };
  }
  if (!extractMentions(body).includes("npc-pm")) {
    return { ok: false, reason: "missing-mention" };
  }
  return { ok: true, reason: "ok" };
}

export function canWrite({ labels = [] }) {
  return labels.includes(WORK_MODE_LABEL);
}

function readLabels(value = "") {
  return String(value)
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const writeOnly = process.argv.includes("--write");
  const labels = readLabels(process.env.ISSUE_LABELS);
  const result = writeOnly
    ? { ok: canWrite({ labels }), reason: canWrite({ labels }) ? "ok" : "missing-label" }
    : canStart({
        authorAssociation: process.env.AUTHOR_ASSOCIATION ?? "",
        labels,
        body: process.env.COMMENT_BODY ?? "",
      });

  console.log(JSON.stringify(result));
  if (!result.ok) process.exit(1);
}
