# AGENT_LOOP_PLAN.md — nthmb

## Goal
Implement a minimal autonomous loop:

plan → execute → evaluate → repeat

---

## Step 1 — CLI
Add command:

run <goal>

Flags:
--max-iterations
--dry-run
--run-id

Acceptance:
running a goal creates artifacts/<runId>/0/plan.json

---

## Step 2 — Schemas
Create Zod schemas for artifacts.

Acceptance:
invalid artifacts are rejected.

---

## Step 3 — Artifact writer
Create helper:

writeArtifact(runId, iteration, name, data)

Acceptance:
artifacts appear in deterministic paths.

---

## Step 4 — SQLite state
Tables:

runs(run_id, goal, status, created_at, updated_at)
iterations(run_id, iteration, status, created_at)

Acceptance:
runs can resume with same runId.

---

## Step 5 — Planner
Implement Planner.plan(context) → Plan

Start with stub planner:
- returns noop or small tasks

Acceptance:
plan.json written every iteration.

---

## Step 6 — Worker execution
Worker.execute(tasks) → Results

Include retry with exponential backoff.

Acceptance:
results.json reflects task outcomes.

---

## Step 7 — Evaluator
Evaluator.evaluate(goal, plan, results) → Verdict

Rules:
- if noop and all ok → done
- if repeated failures → failed
- else → continue

Acceptance:
verdict.json controls loop flow.

---

## Step 8 — Guardrails
- max iterations
- dry-run mode
- ctrl+c graceful stop → verdict = stopped

---

## Step 9 — LLM adapter
Create interface:

LLMClient.generate(prompt) → text

Acceptance:
planner can run without LLM (stub mode).
