import test from "node:test";
import assert from "node:assert/strict";
import { parseNext } from "../scripts/next.mjs";

test("parses a valid next role", () => {
  assert.deepEqual(parseNext("work done\nNEXT:npc-java"), { role: "npc-java" });
});

test("parses NEXT:none", () => {
  assert.deepEqual(parseNext("all done\nNEXT:none"), { role: null });
});

test("the last NEXT line wins", () => {
  assert.deepEqual(parseNext("NEXT:npc-java\nNEXT:npc-react"), { role: "npc-react" });
});

test("rejects an unknown role", () => {
  assert.deepEqual(parseNext("NEXT:npc-missing"), { role: null, error: "unknown-role" });
});

test("reports a missing NEXT line", () => {
  assert.deepEqual(parseNext("no handoff here"), { role: null, error: "missing-next" });
});
