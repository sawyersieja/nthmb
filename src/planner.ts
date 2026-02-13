import type { Plan } from "./schemas/artifacts.js";

export interface Planner {
  plan(context: { runId: string; iteration: number; goal: string }): Promise<Plan>;
}

export class StubPlanner implements Planner {
  async plan(context: { runId: string; iteration: number; goal: string }): Promise<Plan> {
    const lowered = context.goal.toLowerCase();
    const task = lowered.includes("write")
      ? {
          id: `task-${context.iteration}-write`,
          type: "write_file" as const,
          title: "Write a goal note",
          rationale: "Goal requests writing",
          inputs: {
            path: `workspace/${context.runId}/${context.iteration}/note.txt`,
            content: context.goal
          }
        }
      : {
          id: `task-${context.iteration}-noop`,
          type: "noop" as const,
          title: "No operation",
          rationale: "Default safe stub behavior",
          inputs: {}
        };

    return {
      runId: context.runId,
      iteration: context.iteration,
      createdAt: new Date().toISOString(),
      goal: context.goal,
      tasks: [task]
    };
  }
}
