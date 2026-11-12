import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export async function ensureBranchPr({ issue, branch, base = "main", run }) {
  const runner =
    run ??
    ((cmd) =>
      execSync(cmd, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "inherit"],
      }));

  const branchRefs = await runner(`git ls-remote --heads origin ${branch}`);
  let branchCreated = false;

  if (!String(branchRefs).trim()) {
    await runner(`git checkout -b ${branch}`);
    await runner(
      `mkdir -p .npc/issue-${issue} && printf '%s\\n' '# Issue ${issue} plan' '' '_Pending PM analysis._' > .npc/issue-${issue}/plan.md`,
    );
    await runner(`git add .npc/issue-${issue}/plan.md`);
    await runner(`git commit -m "chore: start issue ${issue}"`);
    await runner(`git push -u origin ${branch}`);
    branchCreated = true;
  } else {
    await runner(`git fetch origin ${branch}`);
    await runner(`git checkout -B ${branch} FETCH_HEAD`);
  }

  const openPrs = await runner(`gh pr list --head ${branch} --state open --json number`);
  let prCreated = false;

  if (String(openPrs).trim() === "[]") {
    await runner(
      `gh pr create --draft --base ${base} --head ${branch} --title "AI NPC: issue ${issue}" --body "Draft PR for issue #${issue}. Human review before merge."`,
    );
    prCreated = true;
  }

  return { branchCreated, prCreated };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const issue = process.env.ISSUE_NUMBER;
  if (!issue) {
    console.error("ISSUE_NUMBER is required");
    process.exit(2);
  }

  ensureBranchPr({
    issue,
    branch: process.env.BRANCH || `ai-npcs/issue-${issue}`,
    base: process.env.BASE_BRANCH || "main",
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
