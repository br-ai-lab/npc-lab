import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "target",
  "dist",
  "build",
  "coverage",
  ".venv",
  "venv",
  ".next",
  ".turbo",
]);

const SKIP_PATHS = /(^|\/)(node_modules|\.git|target|dist|build|coverage|\.venv|venv|\.next|\.turbo)\//;

const DETECTORS = [
  { file: "package-lock.json", command: "npm ci" },
  { file: "pnpm-lock.yaml", command: "pnpm install --frozen-lockfile" },
  { file: "yarn.lock", command: "yarn install --frozen-lockfile" },
  { file: "pom.xml", command: "mvn -q -DskipTests dependency:go-offline" },
  { file: "requirements.txt", command: "python3 -m pip install -r requirements.txt" },
  { file: "go.mod", command: "go mod download" },
];

export function detectInstallCommands(paths) {
  const commands = [];
  const seen = new Set();

  for (const path of paths) {
    const normalized = path.replace(/\\/g, "/");
    if (SKIP_PATHS.test(normalized)) continue;

    const base = normalized.split("/").pop();
    const detector = DETECTORS.find((entry) => entry.file === base);
    if (!detector) continue;

    const dir = dirname(normalized) || ".";
    const key = `${dir}:${detector.command}`;
    if (seen.has(key)) continue;

    seen.add(key);
    commands.push({ dir, command: detector.command });
  }

  return commands;
}

function collectFiles(root, relative = "", depth = 0, out = []) {
  if (depth > 3) return out;

  for (const entry of readdirSync(join(root, relative), { withFileTypes: true })) {
    if (entry.name.startsWith(".") || IGNORED_DIRS.has(entry.name)) continue;

    const next = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      collectFiles(root, next, depth + 1, out);
    } else if (entry.isFile()) {
      out.push(next);
    }
  }

  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const commands = detectInstallCommands(collectFiles(process.cwd()));

  if (commands.length === 0) {
    console.log("no dependency files detected");
    process.exit(0);
  }

  for (const { dir, command } of commands) {
    const tool = command.split(" ")[0];
    try {
      execSync(`command -v ${tool}`, { stdio: "ignore" });
    } catch {
      console.log(`skip ${dir}: ${tool} not found`);
      continue;
    }

    console.log(`prepare ${dir}: ${command}`);
    try {
      execSync(command, { cwd: dir, stdio: "inherit", timeout: 600000 });
    } catch (error) {
      console.error(`prepare failed in ${dir}: ${error.message}`);
    }
  }
}
