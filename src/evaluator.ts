import type { Plan, Results, Verdict } from "./schemas/artifacts.js";

export interface Evaluator {
  evaluate(goal: string, plan: Plan, results: Results): Verdict;
}

export class BasicEvaluator implements Evaluator {
  evaluate(_goal: string, plan: Plan, results: Results): Verdict {
    const allOk = results.taskResults.every((t) => t.ok);
    const allNoop = plan.tasks.every((t) => t.type === "noop");
    const failedCount = results.taskResults.filter((t) => !t.ok).length;

    if (allOk && allNoop) {
      return {
        runId: plan.runId,
        iteration: plan.iteration,
        createdAt: new Date().toISOString(),
        status: "done",
        rationale: "Noop plan succeeded; work is complete"
      };
    }

    if (failedCount >= 2) {
      return {
        runId: plan.runId,
        iteration: plan.iteration,
        createdAt: new Date().toISOString(),
        status: "failed",
        rationale: "Repeated task failures detected",
        next: { stopReason: "repeated-failures" }
      };
    }

    return {
      runId: plan.runId,
      iteration: plan.iteration,
      createdAt: new Date().toISOString(),
      status: "continue",
      rationale: "Tasks completed but more iterations may be needed",
      next: { suggestedTasks: ["Refine next step"] }
    };
  }
}
