import type { Plan, Task } from "./schemas/artifacts.js";

export interface Planner {
  plan(context: { runId: string; iteration: number; goal: string }): Promise<Plan>;
}

function parseToolGoal(goal: string, iteration: number): Task | null {
  const toolGoal = goal.slice(5).trim();

  if (toolGoal.startsWith("read ")) {
    return {
      id: `task-${iteration}-read`,
      type: "read_file",
      title: "Read file",
      rationale: "Tool goal requested file read",
      inputs: { path: toolGoal.slice(5).trim() }
    };
  }

  if (toolGoal.startsWith("list")) {
    const root = toolGoal.slice(4).trim();
    return {
      id: `task-${iteration}-list`,
      type: "list_files",
      title: "List files",
      rationale: "Tool goal requested file listing",
      inputs: root.length > 0 ? { root } : {}
    };
  }

  if (toolGoal.startsWith("grep ")) {
    const grepMatch = toolGoal.match(/^grep\s+"([^"]+)"(?:\s+(.+))?$/u);
    if (grepMatch) {
      return {
        id: `task-${iteration}-grep`,
        type: "grep",
        title: "Search text",
        rationale: "Tool goal requested grep",
        inputs: { pattern: grepMatch[1], root: grepMatch[2] ?? "." }
      };
    }
  }

  if (toolGoal.startsWith("verify")) {
    return {
      id: `task-${iteration}-verify`,
      type: "verify",
      title: "Run verification",
      rationale: "Tool goal requested verify",
      inputs: {}
    };
  }

  if (toolGoal.startsWith("apply_patch ")) {
    return {
      id: `task-${iteration}-apply-patch`,
      type: "apply_patch",
      title: "Apply unified patch",
      rationale: "Tool goal requested patch apply",
      inputs: { patch: toolGoal.slice("apply_patch ".length) }
    };
  }

  return null;
}

export class StubPlanner implements Planner {
  async plan(context: { runId: string; iteration: number; goal: string }): Promise<Plan> {
    if (context.goal.startsWith("tool:")) {
      const toolTask = parseToolGoal(context.goal, context.iteration);
      const tasks: Task[] =
        toolTask === null
          ? [
              {
                id: `task-${context.iteration}-noop`,
                type: "noop",
                title: "No operation",
                rationale: "Unrecognized tool command",
                inputs: {}
              }
            ]
          : [toolTask];

      return {
        runId: context.runId,
        iteration: context.iteration,
        createdAt: new Date().toISOString(),
        goal: context.goal,
        tasks
      };
    }

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
