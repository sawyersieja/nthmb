import { randomBytes } from "node:crypto";
import { runAgent } from "./agent.js";

function makeRunId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}_${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
  return `${stamp}_${randomBytes(2).toString("hex")}`;
}

function parseArgs(argv: string[]): { goal: string; maxIterations: number; dryRun: boolean; runId: string } {
  if (argv[0] !== "run") {
    throw new Error('Usage: pnpm dev run "<goal>" [--max-iterations N] [--dry-run] [--run-id ID]');
  }

  const goal = argv[1];
  if (!goal) {
    throw new Error("Goal is required");
  }

  let maxIterations = 10;
  let dryRun = false;
  let runId: string | undefined;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--max-iterations") {
      const value = Number(argv[i + 1]);
      if (!Number.isInteger(value) || value <= 0) throw new Error("--max-iterations must be a positive integer");
      maxIterations = value;
      i += 1;
    } else if (arg === "--run-id") {
      runId = argv[i + 1];
      if (!runId) throw new Error("--run-id requires a value");
      i += 1;
    }
  }

  return { goal, maxIterations, dryRun, runId: runId ?? makeRunId() };
}

const args = parseArgs(process.argv.slice(2));
let interrupted = false;
process.on("SIGINT", () => {
  interrupted = true;
});

if (interrupted) {
  process.exit(130);
}

runAgent({ ...args, shouldStop: () => interrupted })
  .then(() => {
    console.log(`Run complete: ${args.runId}`);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Run failed: ${message}`);
    process.exitCode = 1;
  });
