import test from "node:test";
import assert from "node:assert/strict";
import { verifyConfig } from "../scripts/verify-config.mjs";

test("the repository configuration is complete", () => {
  assert.deepEqual(verifyConfig(process.cwd()), []);
});
