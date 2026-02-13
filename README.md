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

## Output artifacts

Each iteration writes to:

```txt
artifacts/<runId>/<iteration>/
  plan.json
  results.json
  verdict.json
```

Dry-run writes only `plan.json` and `verdict.json` with status `stopped` and `next.stopReason = "dry-run"`.
