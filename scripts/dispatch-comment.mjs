import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { extractMentions } from "./mention.mjs";
import { getRole, roleSlugs } from "./team.mjs";

const WRITE_ROLES = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const WORK_MODE_LABEL = "npc-work-mode";
const MAX_DISPATCH_ROLES = 3;

export function selectDispatchRoles({ body = "", authorAssociation, labels = [] }) {
  if (!WRITE_ROLES.has(authorAssociation)) {
    return { roles: [], error: "forbidden-actor" };
  }
  if (!labels.includes(WORK_MODE_LABEL)) {
    return { roles: [], error: "missing-label" };
  }

  const known = roleSlugs();
  const mentions = [
    ...new Set(extractMentions(body).filter((slug) => known.includes(slug))),
  ];

  if (mentions.length === 0) return { roles: [], error: "missing-mention" };
  if (mentions.length > MAX_DISPATCH_ROLES) {
    return { roles: [], error: "too-many-roles" };
  }

  return { roles: mentions.map((slug) => getRole(slug)) };
}

function readLabels(value = "") {
  return String(value)
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const issue = process.env.ISSUE_NUMBER;
  const repo = process.env.GITHUB_REPOSITORY;

  if (!issue || !repo) {
    console.error("ISSUE_NUMBER and GITHUB_REPOSITORY are required");
    process.exit(2);
  }

  const result = selectDispatchRoles({
    body: process.env.COMMENT_BODY ?? "",
    authorAssociation: process.env.AUTHOR_ASSOCIATION ?? "",
    labels: readLabels(process.env.ISSUE_LABELS),
  });

  if (result.error) {
    console.log(JSON.stringify(result));
    process.exit(0);
  }

  for (const role of result.roles) {
    execSync(
      `gh api repos/${repo}/dispatches -f event_type=${role.eventType} -f client_payload[issue]=${issue} -f client_payload[branch]=ai-npcs/issue-${issue}`,
      { stdio: "inherit" },
    );
  }

  console.log(JSON.stringify({ dispatched: result.roles.map((role) => role.slug) }));
}
