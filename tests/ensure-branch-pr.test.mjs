import test from "node:test";
import assert from "node:assert/strict";
import { ensureBranchPr } from "../scripts/ensure-branch-pr.mjs";

test("creates a branch and draft PR when neither exists", async () => {
  const calls = [];
  const run = async (cmd) => {
    calls.push(cmd);
    if (cmd.startsWith("git ls-remote")) return "";
    if (cmd.startsWith("gh pr list")) return "[]";
    return "";
  };
  const result = await ensureBranchPr({ issue: 4, branch: "ai-npcs/issue-4", base: "main", run });
  assert.deepEqual(result, { branchCreated: true, prCreated: true });
  assert.ok(calls.some((c) => c.includes("git checkout -b ai-npcs/issue-4")));
  assert.ok(calls.some((c) => c.includes("gh pr create --draft")));
});

test("is a no-op when the branch and PR already exist", async () => {
  const calls = [];
  const run = async (cmd) => {
    calls.push(cmd);
    if (cmd.startsWith("git ls-remote")) return "abc123\trefs/heads/ai-npcs/issue-4";
    if (cmd.startsWith("gh pr list")) return '[{"number":5}]';
    return "";
  };
  const result = await ensureBranchPr({ issue: 4, branch: "ai-npcs/issue-4", base: "main", run });
  assert.deepEqual(result, { branchCreated: false, prCreated: false });
  assert.ok(calls.some((c) => c.includes("git fetch origin ai-npcs/issue-4")));
  assert.ok(calls.some((c) => c.includes("git checkout -B ai-npcs/issue-4 FETCH_HEAD")));
  assert.ok(!calls.some((c) => c.includes("git push")));
  assert.ok(!calls.some((c) => c.includes("gh pr create")));
});
