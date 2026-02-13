import { z } from "zod";

const isoDate = z.string().datetime();

export const taskSchema = z.object({
  id: z.string(),
  type: z.enum(["noop", "write_file", "edit_file", "shell", "db"]),
  title: z.string(),
  rationale: z.string(),
  inputs: z.record(z.unknown())
});

export const planSchema = z.object({
  runId: z.string(),
  iteration: z.number().int().nonnegative(),
  createdAt: isoDate,
  goal: z.string(),
  tasks: z.array(taskSchema)
});

export const taskResultSchema = z.object({
  taskId: z.string(),
  ok: z.boolean(),
  startedAt: isoDate,
  finishedAt: isoDate,
  output: z.unknown().optional(),
  error: z.object({ message: z.string(), stack: z.string().optional() }).optional(),
  logs: z.array(z.string()).optional()
});

export const resultsSchema = z.object({
  runId: z.string(),
  iteration: z.number().int().nonnegative(),
  createdAt: isoDate,
  taskResults: z.array(taskResultSchema)
});

export const verdictSchema = z.object({
  runId: z.string(),
  iteration: z.number().int().nonnegative(),
  createdAt: isoDate,
  status: z.enum(["continue", "done", "failed", "stopped"]),
  rationale: z.string(),
  next: z
    .object({
      suggestedTasks: z.array(z.string()).optional(),
      stopReason: z.string().optional()
    })
    .optional()
});

export type Task = z.infer<typeof taskSchema>;
export type Plan = z.infer<typeof planSchema>;
export type TaskResult = z.infer<typeof taskResultSchema>;
export type Results = z.infer<typeof resultsSchema>;
export type Verdict = z.infer<typeof verdictSchema>;
