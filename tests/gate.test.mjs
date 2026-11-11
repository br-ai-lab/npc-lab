import test from "node:test";
import assert from "node:assert/strict";
import { canStart, canWrite } from "../scripts/gate.mjs";

const workMode = { labels: ["npc-work-mode"] };

test("owner with label and a real mention can start", () => {
  assert.deepEqual(canStart({ authorAssociation: "OWNER", ...workMode, body: "@npc-pm 请开始" }), { ok: true, reason: "ok" });
});

test("member and collaborator can start", () => {
  for (const a of ["MEMBER", "COLLABORATOR"]) {
    assert.equal(canStart({ authorAssociation: a, ...workMode, body: "@npc-pm 请开始" }).ok, true);
  }
});

test("contributor or none cannot start", () => {
  for (const a of ["CONTRIBUTOR", "NONE", "FIRST_TIME_CONTRIBUTOR"]) {
    assert.equal(canStart({ authorAssociation: a, ...workMode, body: "@npc-pm 请开始" }).ok, false);
  }
});

test("missing work-mode label blocks start", () => {
  assert.deepEqual(canStart({ authorAssociation: "OWNER", labels: [], body: "@npc-pm 请开始" }), { ok: false, reason: "missing-label" });
});

test("mention inside a table does not start", () => {
  const body = "| 角色 | 任务 |\n|---|---|\n| @npc-pm | 开始 |";
  assert.equal(canStart({ authorAssociation: "OWNER", ...workMode, body }).ok, false);
});

test("canWrite follows the label", () => {
  assert.equal(canWrite(workMode), true);
  assert.equal(canWrite({ labels: [] }), false);
});

test("checks the requested role mention", () => {
  assert.equal(
    canStart({ authorAssociation: "OWNER", ...workMode, body: "@npc-java 请开始", role: "npc-java" }).ok,
    true,
  );
  assert.equal(
    canStart({ authorAssociation: "OWNER", ...workMode, body: "@npc-java 请开始", role: "npc-pm" }).ok,
    false,
  );
});
