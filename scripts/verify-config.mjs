import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { TEAM, validateTeam } from "./team.mjs";

const ROLE_SLUGS = TEAM.map((role) => role.slug);
const TEMPLATES = ["work-order.md", "report.md", "status.md", "final-summary.md"];
const FORBIDDEN_MERGE_COMMANDS = ["gh pr merge", "auto-merge", "--auto"];

function read(root, relativePath) {
  const path = join(root, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

export function verifyConfig(root = process.cwd()) {
  const problems = [];

  const packageJson = read(root, "package.json");
  if (packageJson === null) {
    problems.push("package.json missing");
  } else {
    try {
      const data = JSON.parse(packageJson);
      if (data.type !== "module") problems.push('package.json must set "type": "module"');
    } catch {
      problems.push("package.json is not valid JSON");
    }
  }

  try {
    validateTeam();
  } catch (error) {
    problems.push(error.message);
  }

  for (const role of TEAM) {
    if (!existsSync(join(root, role.promptPath))) problems.push(`missing prompt: ${role.promptPath}`);
    if (!existsSync(join(root, role.skillPath))) problems.push(`missing skill: ${role.skillPath}`);
  }

  for (const slug of ROLE_SLUGS) {
    const relativePath = `.github/workflows/${slug}.yml`;
    const workflow = read(root, relativePath);
    if (workflow === null) {
      problems.push(`missing workflow: ${relativePath}`);
      continue;
    }
    if (!workflow.includes("repository_dispatch")) {
      problems.push(`${relativePath}: missing repository_dispatch trigger`);
    }
    if (!workflow.includes('gate-mode: "write"')) {
      problems.push(`${relativePath}: missing write gate mode`);
    }
    if (["npc-java", "npc-react"].includes(slug) && !workflow.includes('prepare-env: "true"')) {
      problems.push(`${relativePath}: missing prepare-env input`);
    }
    if (slug === "npc-qa") {
      if (!workflow.includes("scripts/prepare-env.mjs")) {
        problems.push(`${relativePath}: missing prepare-env step`);
      }
      if (!workflow.includes("scripts/services.mjs start")) {
        problems.push(`${relativePath}: missing services start step`);
      }
      if (!workflow.includes("scripts/services.mjs stop")) {
        problems.push(`${relativePath}: missing services stop step`);
      }
    }
    if (!workflow.includes("npc-timing.json")) {
      problems.push(`${relativePath}: missing timing artifact upload`);
    }
    if (!workflow.includes("claude-token")) {
      problems.push(`${relativePath}: missing claude-token input`);
    }
    if (!workflow.includes("anthropic-auth-token")) {
      problems.push(`${relativePath}: missing anthropic-auth-token input`);
    }
    if (/\$\{\{[^\n]*#/.test(workflow)) {
      problems.push(`${relativePath}: '#' inside a \${{ }} expression can start a YAML comment`);
    }
    if (!workflow.includes(`group: ${slug}-issue-`)) {
      problems.push(`${relativePath}: missing role-specific concurrency group`);
    }
    for (const command of FORBIDDEN_MERGE_COMMANDS) {
      if (workflow.includes(command)) {
        problems.push(`${relativePath}: forbidden merge command ${command}`);
      }
    }
  }

  const dispatcher = read(root, ".github/workflows/npc-dispatch.yml");
  if (dispatcher === null) {
    problems.push("missing dispatcher workflow");
  } else {
    if (!dispatcher.includes("github.event.comment.user.type == 'User'")) {
      problems.push("dispatcher: missing human-only comment gate");
    }
    if (!dispatcher.includes("scripts/dispatch-comment.mjs")) {
      problems.push("dispatcher: missing dispatch-comment step");
    }
  }

  const action = read(root, ".github/actions/npc-agent/action.yml");
  if (action === null) {
    problems.push("missing composite action");
  } else if (!action.includes("actions/create-github-app-token")) {
    problems.push("composite action missing create-github-app-token");
  }

  for (const template of TEMPLATES) {
    if (!existsSync(join(root, ".github/npc/templates", template))) {
      problems.push(`missing template: ${template}`);
    }
  }

  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = verifyConfig(process.cwd());
  if (problems.length > 0) {
    for (const problem of problems) console.error(problem);
    process.exit(1);
  }
  console.log("config ok");
}
