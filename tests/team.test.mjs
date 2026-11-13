import test from "node:test";
import assert from "node:assert/strict";
import { TEAM, getRole, roleSlugs, validateTeam } from "../scripts/team.mjs";

test("defines exactly the five roles", () => {
  assert.deepEqual(roleSlugs(), ["npc-pm", "npc-ocr", "npc-java", "npc-react", "npc-qa"]);
});

test("each role has the required fields", () => {
  for (const role of TEAM) {
    assert.match(role.slug, /^npc-[a-z0-9-]+$/);
    assert.ok(role.name);
    assert.ok(role.appSecretPrefix);
    assert.match(role.eventType, /^npc-[a-z0-9-]+$/);
    assert.ok(role.promptPath.endsWith(".md"));
    assert.ok(role.skillPath.endsWith("SKILL.md"));
    assert.ok(role.scope);
    assert.ok(Number.isInteger(role.maxTurns) && role.maxTurns > 0);
    assert.ok(Number.isInteger(role.maxWallClockMinutes) && role.maxWallClockMinutes > 0);
  }
});

test("getRole returns the matching role", () => {
  assert.equal(getRole("npc-java").name, "Java 开发");
  assert.equal(getRole("npc-missing"), undefined);
});

test("validateTeam rejects duplicate slugs", () => {
  const bad = [...TEAM, { ...TEAM[0] }];
  assert.throws(() => validateTeam(bad), /duplicate slug/);
});
