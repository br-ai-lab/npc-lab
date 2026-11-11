import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { TEAM } from "../scripts/team.mjs";

for (const role of TEAM) {
  test(`${role.slug} prompt exists and defines the handoff`, () => {
    assert.ok(existsSync(role.promptPath), `${role.promptPath} missing`);
    const text = readFileSync(role.promptPath, "utf8");
    assert.match(text, /NEXT:/);
    assert.match(text, /npc-/);
    assert.match(text, /main/);
    assert.match(text, /npc-work-mode|work-mode/);
  });

  test(`${role.slug} skill exists`, () => {
    assert.ok(existsSync(role.skillPath), `${role.skillPath} missing`);
  });
}
