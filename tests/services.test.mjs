import test from "node:test";
import assert from "node:assert/strict";
import { detectDefaultServices, parseServicesConfig } from "../scripts/services.mjs";

test("detects backend and frontend services", () => {
  const services = detectDefaultServices(["backend/pom.xml", "frontend/package.json"]);
  assert.deepEqual(services.map((service) => service.name), ["backend", "frontend"]);
  assert.match(services[0].command, /mvn/);
  assert.match(services[1].command, /npm run dev/);
});

test("parses a services config and fills defaults", () => {
  const services = parseServicesConfig({
    services: [
      {
        name: "api",
        cwd: "backend",
        command: "mvn spring-boot:run",
        health: "http://localhost:8080/health",
      },
    ],
  });
  assert.equal(services[0].name, "api");
  assert.equal(services[0].healthTimeoutSeconds, 120);
});

test("rejects invalid services config", () => {
  assert.throws(() => parseServicesConfig({ services: [{ name: "x" }] }), /missing cwd/);
});
