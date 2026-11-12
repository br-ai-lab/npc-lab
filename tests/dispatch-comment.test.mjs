import test from "node:test";
import assert from "node:assert/strict";
import { selectDispatchRoles } from "../scripts/dispatch-comment.mjs";

const base = { authorAssociation: "OWNER", labels: ["npc-work-mode"] };

test("dispatches a mentioned role", () => {
  const result = selectDispatchRoles({ ...base, body: "@npc-java 请继续" });
  assert.deepEqual(result.roles.map((role) => role.slug), ["npc-java"]);
});

test("ignores mentions in tables", () => {
  assert.deepEqual(
    selectDispatchRoles({ ...base, body: "| @npc-java | x |\n|---|---|" }),
    { roles: [], error: "missing-mention" },
  );
});

test("requires the work-mode label", () => {
  assert.deepEqual(
    selectDispatchRoles({ authorAssociation: "OWNER", labels: [], body: "@npc-java" }),
    { roles: [], error: "missing-label" },
  );
});

test("rejects non-write actors", () => {
  assert.deepEqual(
    selectDispatchRoles({ ...base, authorAssociation: "CONTRIBUTOR", body: "@npc-java" }),
    { roles: [], error: "forbidden-actor" },
  );
});

test("dispatches multiple roles", () => {
  const result = selectDispatchRoles({ ...base, body: "@npc-java @npc-react" });
  assert.deepEqual(result.roles.map((role) => role.slug), ["npc-java", "npc-react"]);
});

test("rejects more than three roles", () => {
  assert.deepEqual(
    selectDispatchRoles({ ...base, body: "@npc-java @npc-react @npc-qa @npc-ocr" }),
    { roles: [], error: "too-many-roles" },
  );
});
