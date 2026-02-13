# ARTIFACTS_SPEC.md — nthmb

Artifacts are written to:

artifacts/<runId>/<iteration>/

All JSON must be UTF-8 and schema validated.

---

## plan.json
{
  runId: string,
  iteration: number,
  createdAt: ISO string,
  goal: string,
  tasks: [
    {
      id: string,
      type: "noop" | "write_file" | "edit_file" | "shell" | "db",
      title: string,
      rationale: string,
      inputs: Record<string, unknown>
    }
  ]
}

---

## results.json
{
  runId: string,
  iteration: number,
  createdAt: ISO string,
  taskResults: [
    {
      taskId: string,
      ok: boolean,
      startedAt: ISO string,
      finishedAt: ISO string,
      output?: unknown,
      error?: { message: string, stack?: string },
      logs?: string[]
    }
  ]
}

---

## verdict.json
{
  runId: string,
  iteration: number,
  createdAt: ISO string,
  status: "continue" | "done" | "failed" | "stopped",
  rationale: string,
  next?: {
    suggestedTasks?: string[],
    stopReason?: string
  }
}

---

## metadata.json (optional)
{
  runId,
  nodeVersion,
  gitCommit,
  config: { maxIterations, dryRun, retryCount }
}
