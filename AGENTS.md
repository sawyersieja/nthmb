# nthmb agent rules

Follow these rules when modifying this repository.

## Primary guidance
- Follow PROJECT_CONTEXT.md and ARTIFACTS_SPEC.md.
- Keep implementation minimal and incremental.
- Prefer readability over abstraction.
- Do not introduce new dependencies unless necessary.
- Do not over-engineer.

## Task constraints (IMPORTANT)
- Max 3 tasks per iteration.
- Max 3 files changed per iteration.
- Prefer <200 lines changed total.
- If larger changes are required, split into multiple iterations.

## Artifact rules
- Artifacts MUST match ARTIFACTS_SPEC.md exactly.
- Do not invent new artifact fields or statuses.
- Valid verdict statuses: continue, done, failed, stopped.

## Dry-run behavior
- Write plan.json and verdict.json only.
- verdict.status = "stopped"
- verdict.next.stopReason = "dry-run"
- Do not execute tasks.

## Safety boundaries
- Never delete user data outside artifacts/.
- Do not modify .env, secrets, or credentials.
- Do not modify package manager lockfiles unless required.

## Quality gates
Before finishing:
- code must typecheck
- code must run
- avoid unused code
