import test from "node:test";
import assert from "node:assert/strict";
import { detectInstallCommands } from "../scripts/prepare-env.mjs";

test("detects npm and maven installs", () => {
  assert.deepEqual(
    detectInstallCommands(["frontend/package-lock.json", "backend/pom.xml"]),
    [
      { dir: "frontend", command: "npm ci" },
      { dir: "backend", command: "mvn -q -DskipTests dependency:go-offline" },
    ],
  );
});

test("detects test project lockfiles", () => {
  assert.deepEqual(
    detectInstallCommands(["tests/visitor-e2e/package-lock.json"]),
    [{ dir: "tests/visitor-e2e", command: "npm ci" }],
  );
});

test("skips node_modules and target", () => {
  assert.deepEqual(
    detectInstallCommands(["node_modules/x/package-lock.json", "backend/target/pom.xml"]),
    [],
  );
});

test("deduplicates the same directory", () => {
  assert.deepEqual(
    detectInstallCommands(["frontend/package-lock.json", "frontend/package-lock.json"]),
    [{ dir: "frontend", command: "npm ci" }],
  );
});
