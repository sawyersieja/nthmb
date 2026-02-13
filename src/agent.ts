import { writeArtifact } from "./artifacts/writer.js";
import { addIteration, getLatestIteration, initDb, upsertRun } from "./db/index.js";
import { BasicEvaluator } from "./evaluator.js";
import { StubPlanner } from "./planner.js";
import { Worker } from "./worker.js";
import { planSchema, resultsSchema, verdictSchema } from "./schemas/artifacts.js";

export interface RunOptions {
  goal: string;
  maxIterations: number;
  dryRun: boolean;
  runId: string;
  shouldStop?: () => boolean;
}

export async function runAgent(options: RunOptions): Promise<void> {
  initDb();
  upsertRun(options.runId, options.goal, "running");

  const planner = new StubPlanner();
  const worker = new Worker();
  const evaluator = new BasicEvaluator();

  const latest = getLatestIteration(options.runId);
  const startIteration = latest + 1;
  const endIterationExclusive = startIteration + options.maxIterations;

  for (let iteration = startIteration; iteration < endIterationExclusive; iteration += 1) {
    if (options.shouldStop?.()) {
      const verdict = {
        runId: options.runId,
        iteration,
        createdAt: new Date().toISOString(),
        status: "stopped" as const,
        rationale: "Interrupted by user",
        next: { stopReason: "user-interrupt" }
      };
      verdictSchema.parse(verdict);
      await writeArtifact(options.runId, iteration, "verdict.json", verdict);
      addIteration(options.runId, iteration, verdict.status);
      upsertRun(options.runId, options.goal, verdict.status);
      return;
    }
    const plan = await planner.plan({ runId: options.runId, iteration, goal: options.goal });
    planSchema.parse(plan);
    await writeArtifact(options.runId, iteration, "plan.json", plan);
    console.log(`[${options.runId}] iteration ${iteration}: plan written`);

    if (options.dryRun) {
      const verdict = {
        runId: options.runId,
        iteration,
        createdAt: new Date().toISOString(),
        status: "stopped" as const,
        rationale: "Dry-run requested",
        next: { stopReason: "dry-run" }
      };
      verdictSchema.parse(verdict);
      await writeArtifact(options.runId, iteration, "verdict.json", verdict);
      addIteration(options.runId, iteration, verdict.status);
      upsertRun(options.runId, options.goal, verdict.status);
      return;
    }

    const results = await worker.execute(options.runId, iteration, plan.tasks);
    resultsSchema.parse(results);
    await writeArtifact(options.runId, iteration, "results.json", results);

    const verdict = evaluator.evaluate(options.goal, plan, results);
    verdictSchema.parse(verdict);
    await writeArtifact(options.runId, iteration, "verdict.json", verdict);

    addIteration(options.runId, iteration, verdict.status);
    upsertRun(options.runId, options.goal, verdict.status);

    console.log(`[${options.runId}] iteration ${iteration}: ${verdict.status}`);

    if (verdict.status === "done" || verdict.status === "failed" || verdict.status === "stopped") {
      return;
    }
  }

  const finalIteration = endIterationExclusive - 1;
  const verdict = {
    runId: options.runId,
    iteration: finalIteration,
    createdAt: new Date().toISOString(),
    status: "stopped" as const,
    rationale: `Reached max iterations for this invocation (${options.maxIterations})`,
    next: { stopReason: "max-iterations" }
  };
  verdictSchema.parse(verdict);
  await writeArtifact(options.runId, finalIteration, "verdict.json", verdict);
  addIteration(options.runId, finalIteration, verdict.status);
  upsertRun(options.runId, options.goal, verdict.status);
}
