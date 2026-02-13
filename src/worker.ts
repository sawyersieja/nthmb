import { exec as execCb } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";
import type { Results, Task, TaskResult } from "./schemas/artifacts.js";

const exec = promisify(execCb);
const MAX_RETRIES = 3;
const SHELL_ALLOWLIST = ["pnpm ", "node ", "tsc "];

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTask(task: Task): Promise<Omit<TaskResult, "taskId">> {
  const startedAt = new Date().toISOString();
  const logs: string[] = [];

  if (task.type === "noop") {
    return { ok: true, startedAt, finishedAt: new Date().toISOString(), logs: ["noop"] };
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
    const isAllowed = SHELL_ALLOWLIST.some((prefix) => command.startsWith(prefix));
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
