# PROJECT_CONTEXT.md — nthmb

## What nthmb is
nthmb is a local-first autonomous agent runner.

It:
- accepts a goal from a CLI
- plans tasks
- executes them via a Worker
- writes deterministic artifacts
- iterates until completion or stop conditions

Tech:
- TypeScript (Node.js ESM)
- tsx runtime
- better-sqlite3 for durable state
- zod for schemas

## Current state
- CLI works
- Worker produces artifacts
- no-op tasks handled
- next step: autonomous loop (plan → execute → evaluate)

## Non-goals (for now)
- No remote services
- No UI
- No distributed orchestration
- No heavy abstractions

## Artifact outputs (each iteration)
Artifacts are written to:

artifacts/<runId>/<iteration>/

Files:
- plan.json
- results.json
- verdict.json

Artifacts must be deterministic and schema-valid.

## Guardrails
- --max-iterations limits loop length (default 10)
- --dry-run generates plan only
- retries with backoff on failures
- handle empty plans and repeated no-ops gracefully

## Reliability principles
- idempotent runs
- resumable via SQLite
- structured logging
- small incremental changes

## Run ID behavior
- If --run-id provided → resume that run.
- Otherwise generate:
  yyyyMMdd_HHmmss_<shortRand>
