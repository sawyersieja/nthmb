import type { Plan, Results, Verdict } from "./schemas/artifacts.js";

export interface Evaluator {
  evaluate(goal: string, plan: Plan, results: Results): Verdict;
}

export class BasicEvaluator implements Evaluator {
  evaluate(_goal: string, plan: Plan, results: Results): Verdict {
    const hasFailures = results.taskResults.some((t) => !t.ok);
    const hasVerify = plan.tasks.some((task) => task.type === "verify");
    const verifySucceeded = results.taskResults.some((result) => {
      const task = plan.tasks.find((candidate) => candidate.id === result.taskId);
      return task?.type === "verify" && result.ok;
    });

    if (hasFailures) {
      return {
        runId: plan.runId,
        iteration: plan.iteration,
        createdAt: new Date().toISOString(),
        status: "failed",
        rationale: "At least one task failed",
        next: { stopReason: "task-failed" }
      };
    }

    if (hasVerify && verifySucceeded) {
      return {
        runId: plan.runId,
        iteration: plan.iteration,
        createdAt: new Date().toISOString(),
        status: "done",
        rationale: "Verify task succeeded with no task failures"
      };
    }

    return {
      runId: plan.runId,
      iteration: plan.iteration,
      createdAt: new Date().toISOString(),
      status: "continue",
      rationale: "No task failures; continue iteration"
    };
  }
}
