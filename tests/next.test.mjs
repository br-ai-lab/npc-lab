import test from "node:test";
import assert from "node:assert/strict";
import { parseNext } from "../scripts/next.mjs";

test("parses a single next role", () => {
  assert.deepEqual(parseNext("work done\nNEXT:npc-java"), { roles: ["npc-java"] });
});

test("parses multiple next roles", () => {
  assert.deepEqual(parseNext("NEXT:npc-java,npc-react"), { roles: ["npc-java", "npc-react"] });
});

test("trims spaces around roles", () => {
  assert.deepEqual(parseNext("NEXT:npc-java, npc-react"), { roles: ["npc-java", "npc-react"] });
});

test("parses NEXT:none", () => {
  assert.deepEqual(parseNext("all done\nNEXT:none"), { roles: [] });
});

test("the last NEXT line wins", () => {
  assert.deepEqual(parseNext("NEXT:npc-java\nNEXT:npc-react"), { roles: ["npc-react"] });
});

test("rejects an unknown role", () => {
  assert.deepEqual(parseNext("NEXT:npc-missing"), { roles: [], error: "unknown-role" });
});

test("reports a missing NEXT line", () => {
  assert.deepEqual(parseNext("no handoff here"), { roles: [], error: "missing-next" });
});

test("rejects more than three roles", () => {
  assert.deepEqual(parseNext("NEXT:npc-java,npc-react,npc-qa,npc-ocr"), {
    roles: [],
    error: "too-many-roles",
  });
});
