import test from "node:test";
import assert from "node:assert/strict";
import { extractMentions, isMentioned } from "../scripts/mention.mjs";

test("finds a mention in a plain paragraph", () => {
  assert.deepEqual(extractMentions("请 @npc-java 实现接口"), ["npc-java"]);
});

test("ignores a mention in a table", () => {
  assert.deepEqual(extractMentions("| 角色 | 任务 |\n|---|---|\n| @npc-java | 后端 |"), []);
});

test("ignores a mention in a fenced code block", () => {
  assert.deepEqual(extractMentions("```\n@npc-java\n```"), []);
});

test("ignores a mention in a blockquote", () => {
  assert.deepEqual(extractMentions("> @npc-java 请实现"), []);
});

test("ignores a mention in a list item", () => {
  assert.deepEqual(extractMentions("- @npc-java 请实现"), []);
});

test("ignores a mention in inline code", () => {
  assert.deepEqual(extractMentions("`@npc-java` 只是示例"), []);
});

test("deduplicates mentions in order", () => {
  assert.deepEqual(extractMentions("@npc-java 和 @npc-java，再 @npc-pm"), ["npc-java", "npc-pm"]);
});

test("isMentioned matches only the requested slug", () => {
  assert.equal(isMentioned("@npc-java 请实现", "npc-java"), true);
  assert.equal(isMentioned("@npc-java 请实现", "npc-pm"), false);
});
