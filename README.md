# nthmb

Minimal local-first autonomous agent loop in TypeScript.

## Requirements

- Node.js 22+
- pnpm

## Install

```bash
pnpm install
```

## Initialize database

```bash
pnpm initdb
```

## Run

```bash
pnpm dev run "hello world"
```

### Flags

- `--max-iterations <n>` (default: 10)
- `--dry-run`
- `--run-id <id>`

## Deterministic tool mode

The planner supports a deterministic tool mode by starting the goal with `tool:`.

> `tool:list` and `tool:grep` require ripgrep (`rg`) installed and available on `PATH`.

```bash
pnpm dev run "tool:list src"
pnpm dev run "tool:read src/cli.ts"
pnpm dev run "tool:grep \"runId\" src"
pnpm dev run "tool:verify"
```

Patch apply example:

```bash
pnpm dev run $'tool:apply_patch diff --git a/tmp-tool-demo.txt b/tmp-tool-demo.txt\nnew file mode 100644\nindex 0000000..e69de29\n--- /dev/null\n+++ b/tmp-tool-demo.txt\n@@ -0,0 +1 @@\n+hello from tool patch'
```

## Output artifacts

Each iteration writes to:

```txt
artifacts/<runId>/<iteration>/
  plan.json
  results.json
  verdict.json
  context.json
```

Dry-run writes only `plan.json` and `verdict.json` with status `stopped` and `next.stopReason = "dry-run"`.
