import { spawn } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const STATE_PATH = "/tmp/npc-services.json";

export function parseServicesConfig(config) {
  const list = Array.isArray(config) ? config : config?.services;
  if (!Array.isArray(list)) {
    throw new Error("services config must be an array or { services: [] }");
  }

  return list.map((service) => {
    if (!service?.name) throw new Error("missing name");
    if (!service.cwd) throw new Error(`missing cwd for ${service.name}`);
    if (!service.command) throw new Error(`missing command for ${service.name}`);
    return {
      name: service.name,
      cwd: service.cwd,
      command: service.command,
      health: service.health ?? null,
      healthTimeoutSeconds: service.healthTimeoutSeconds ?? 120,
      env: service.env ?? {},
    };
  });
}

export function detectDefaultServices(paths) {
  const normalized = new Set(paths.map((path) => path.replace(/\\/g, "/")));
  const services = [];

  if (normalized.has("backend/pom.xml")) {
    services.push({
      name: "backend",
      cwd: "backend",
      command: "mvn -q spring-boot:run",
      health: "http://localhost:8080/health",
      healthTimeoutSeconds: 180,
      env: {},
    });
  }

  if (normalized.has("frontend/package.json")) {
    services.push({
      name: "frontend",
      cwd: "frontend",
      command: "npm run dev -- --host 127.0.0.1",
      health: "http://127.0.0.1:5173",
      healthTimeoutSeconds: 120,
      env: {},
    });
  }

  return services;
}

export function loadServices({ root = process.cwd(), issue } = {}) {
  const candidates = [];
  if (issue) candidates.push(join(root, `.npc/issue-${issue}/services.json`));
  candidates.push(join(root, ".npc/services.json"));

  for (const path of candidates) {
    if (existsSync(path)) {
      return parseServicesConfig(JSON.parse(readFileSync(path, "utf8")));
    }
  }

  const paths = [];
  if (existsSync(join(root, "backend/pom.xml"))) paths.push("backend/pom.xml");
  if (existsSync(join(root, "frontend/package.json"))) paths.push("frontend/package.json");
  return detectDefaultServices(paths);
}

async function waitForHealth(url, timeoutSeconds) {
  if (!url) return true;

  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (response.ok) return true;
    } catch {
      // service not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return false;
}

export async function startServices({ services, root = process.cwd() }) {
  const state = [];

  for (const service of services) {
    const logPath = `/tmp/npc-${service.name}.log`;
    const fd = openSync(logPath, "a");
    const child = spawn("bash", ["-lc", service.command], {
      cwd: join(root, service.cwd),
      env: { ...process.env, ...service.env },
      detached: true,
      stdio: ["ignore", fd, fd],
    });
    closeSync(fd);
    child.unref();

    writeFileSync(`/tmp/npc-${service.name}.pid`, String(child.pid));
    state.push({ name: service.name, pid: child.pid, log: logPath });

    const healthy = await waitForHealth(service.health, service.healthTimeoutSeconds);
    console.log(
      `${service.name}: pid=${child.pid} health=${healthy ? "ok" : "timeout"} log=${logPath}`,
    );
  }

  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return state;
}

export async function stopServices() {
  if (!existsSync(STATE_PATH)) return;

  const state = JSON.parse(readFileSync(STATE_PATH, "utf8"));
  for (const { pid } of state) {
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // already gone
      }
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));

  for (const { pid } of state) {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // already gone
      }
    }
  }

  unlinkSync(STATE_PATH);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2];

  if (command === "start") {
    const services = loadServices({
      root: process.cwd(),
      issue: process.env.ISSUE_NUMBER,
    });

    if (services.length === 0) {
      console.log("no services configured");
      process.exit(0);
    }

    await startServices({ services, root: process.cwd() });
  } else if (command === "stop") {
    await stopServices();
  } else {
    console.error("usage: node scripts/services.mjs start|stop");
    process.exit(2);
  }
}
