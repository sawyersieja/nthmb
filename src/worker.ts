import { exec as execCb, execFile as execFileCb } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import type { Results, Task, TaskResult } from "./schemas/artifacts.js";

const exec = promisify(execCb);
const execFile = promisify(execFileCb);
const MAX_RETRIES = 3;
const SHELL_ALLOWLIST = ["pnpm ", "node ", "tsc "];
const DEFAULT_VERIFY_COMMANDS = ["pnpm typecheck"];
const RG_REQUIRED_MESSAGE = "ripgrep (rg) is required for list_files/grep. Install ripgrep and ensure 'rg' is on PATH.";

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePositiveInt(input: unknown, fallback: number): number {
  const value = Number(input);
  if (!Number.isInteger(value) || value <= 0) return fallback;
  return value;
}

function isAllowlistedShellCommand(command: string): boolean {
  return SHELL_ALLOWLIST.some((prefix) => command.startsWith(prefix));
}

async function runTask(task: Task): Promise<Omit<TaskResult, "taskId">> {
  const startedAt = new Date().toISOString();
  const logs: string[] = [];

  if (task.type === "noop") {
    return { ok: true, startedAt, finishedAt: new Date().toISOString(), logs: ["noop"] };
  }

  if (task.type === "read_file") {
    const path = String(task.inputs.path ?? "");
    const maxBytes = parsePositiveInt(task.inputs.maxBytes, 1024 * 1024);
    const content = await readFile(path, "utf8");
    const truncated = Buffer.byteLength(content, "utf8") > maxBytes;
    const safeContent = truncated ? Buffer.from(content, "utf8").subarray(0, maxBytes).toString("utf8") : content;
    return {
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      output: { path, content: safeContent, truncated }
    };
  }

  if (task.type === "list_files") {
    const root = String(task.inputs.root ?? ".");
    const pattern = task.inputs.pattern === undefined ? "" : String(task.inputs.pattern);
    const max = parsePositiveInt(task.inputs.max, 200);
    try {
      const { stdout } = await execFile("rg", ["--files", root]);
      const files = stdout
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .filter((line) => (pattern.length === 0 ? true : line.includes(pattern)))
        .slice(0, max);
      return { ok: true, startedAt, finishedAt: new Date().toISOString(), output: { files } };
    } catch (error) {
      const details = error as { code?: string; stdout?: string; stderr?: string; message?: string };
      if (details.stdout) logs.push(String(details.stdout).trim());
      if (details.stderr) logs.push(String(details.stderr).trim());
      if (details.code === "ENOENT") {
        return {
          ok: false,
          startedAt,
          finishedAt: new Date().toISOString(),
          error: { message: RG_REQUIRED_MESSAGE },
          logs: logs.length > 0 ? logs : undefined
        };
      }
      return {
        ok: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        error: { message: details.message ?? "list_files failed" },
        logs: logs.length > 0 ? logs : undefined
      };
    }
  }

  if (task.type === "grep") {
    const root = String(task.inputs.root ?? ".");
    const pattern = String(task.inputs.pattern ?? "");
    const maxMatches = parsePositiveInt(task.inputs.maxMatches, 50);
    try {
      const { stdout } = await execFile("rg", ["-n", "--no-heading", "--color", "never", "-m", String(maxMatches), pattern, root]);
      const matches = stdout
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .slice(0, maxMatches)
        .map((line) => {
          const firstColon = line.indexOf(":");
          const secondColon = line.indexOf(":", firstColon + 1);
          const path = line.slice(0, firstColon);
          const lineNumber = Number(line.slice(firstColon + 1, secondColon));
          const text = line.slice(secondColon + 1);
          return { path, line: lineNumber, text };
        });
      return { ok: true, startedAt, finishedAt: new Date().toISOString(), output: { matches } };
    } catch (error) {
      const details = error as { code?: string; stdout?: string; stderr?: string; message?: string };
      if (details.stdout) logs.push(String(details.stdout).trim());
      if (details.stderr) logs.push(String(details.stderr).trim());
      if (details.code === "ENOENT") {
        return {
          ok: false,
          startedAt,
          finishedAt: new Date().toISOString(),
          error: { message: RG_REQUIRED_MESSAGE },
          logs: logs.length > 0 ? logs : undefined
        };
      }
      return {
        ok: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        error: { message: details.message ?? "grep failed" },
        logs: logs.length > 0 ? logs : undefined
      };
    }
  }

  if (task.type === "apply_patch") {
    const patch = String(task.inputs.patch ?? "");
    const patchDir = await mkdtemp(join(tmpdir(), "nthmb-patch-"));
    const patchPath = join(patchDir, "change.patch");
    await writeFile(patchPath, patch, "utf8");
    try {
      await execFile("git", ["apply", "--check", "--whitespace=nowarn", patchPath]);
      await execFile("git", ["apply", "--whitespace=nowarn", patchPath]);
    } finally {
      await rm(patchDir, { recursive: true, force: true });
    }
    logs.push("patch applied");
    return { ok: true, startedAt, finishedAt: new Date().toISOString(), logs };
  }

  if (task.type === "verify") {
    const rawCommands = Array.isArray(task.inputs.commands)
      ? task.inputs.commands.map((command) => String(command))
      : DEFAULT_VERIFY_COMMANDS;

    for (const command of rawCommands) {
      if (!isAllowlistedShellCommand(command)) {
        return {
          ok: false,
          startedAt,
          finishedAt: new Date().toISOString(),
          error: { message: `verify command is not allowlisted: ${command}` }
        };
      }
      const { stdout, stderr } = await exec(command);
      if (stdout) logs.push(stdout.trim());
      if (stderr) logs.push(stderr.trim());
    }

    return { ok: true, startedAt, finishedAt: new Date().toISOString(), logs };
  }

  if (task.type === "write_file") {
    const path = String(task.inputs.path ?? "");
    const content = String(task.inputs.content ?? "");
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf8");
    logs.push(`wrote ${path}`);
    return { ok: true, startedAt, finishedAt: new Date().toISOString(), logs };
  }

  if (task.type === "edit_file") {
    const path = String(task.inputs.path ?? "");
    const find = String(task.inputs.find ?? "");
    const replace = String(task.inputs.replace ?? "");
    if (find.length === 0) {
      return {
        ok: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        error: { message: "edit_file requires a non-empty find string" }
      };
    }
    const original = await readFile(path, "utf8");
    if (!original.includes(find)) {
      return {
        ok: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        error: { message: `edit_file could not find match in ${path}` }
      };
    }
    const updated = original.replace(find, replace);
    await writeFile(path, updated, "utf8");
    logs.push(`edited ${path}`);
    return { ok: true, startedAt, finishedAt: new Date().toISOString(), logs };
  }

  if (task.type === "shell") {
    const command = String(task.inputs.command ?? "");
    const isAllowed = isAllowlistedShellCommand(command);
    if (!isAllowed) {
      return {
        ok: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        error: { message: `shell command is not allowlisted: ${command}` }
      };
    }
    const { stdout, stderr } = await exec(command);
    if (stdout) logs.push(stdout.trim());
    if (stderr) logs.push(stderr.trim());
    return { ok: true, startedAt, finishedAt: new Date().toISOString(), logs };
  }

  return {
    ok: false,
    startedAt,
    finishedAt: new Date().toISOString(),
    error: { message: `Unsupported task type: ${task.type}` }
  };
}

export class Worker {
  async execute(runId: string, iteration: number, tasks: Task[]): Promise<Results> {
    const taskResults: TaskResult[] = [];

    for (const task of tasks) {
      let lastError: unknown;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
        try {
          const result = await runTask(task);
          taskResults.push({ taskId: task.id, ...result });
          lastError = undefined;
          break;
        } catch (error) {
          lastError = error;
          if (attempt < MAX_RETRIES - 1) {
            await sleep(100 * 2 ** attempt);
          }
        }
      }

      if (lastError !== undefined) {
        const err = lastError instanceof Error ? lastError : new Error(String(lastError));
        taskResults.push({
          taskId: task.id,
          ok: false,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          error: { message: err.message, stack: err.stack }
        });
      }
    }

    return {
      runId,
      iteration,
      createdAt: new Date().toISOString(),
      taskResults
    };
  }
}
