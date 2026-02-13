import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = "state/nthmb.db";

export function openDb(): Database.Database {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  return new Database(DB_PATH);
}

export function initDb(): void {
  const db = openDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      run_id TEXT PRIMARY KEY,
      goal TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS iterations (
      run_id TEXT NOT NULL,
      iteration INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (run_id, iteration),
      FOREIGN KEY (run_id) REFERENCES runs(run_id)
    );
  `);
  db.close();
}

export function upsertRun(runId: string, goal: string, status: string): void {
  const db = openDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO runs (run_id, goal, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(run_id)
     DO UPDATE SET goal=excluded.goal, status=excluded.status, updated_at=excluded.updated_at`
  ).run(runId, goal, status, now, now);
  db.close();
}

export function addIteration(runId: string, iteration: number, status: string): void {
  const db = openDb();
  db.prepare(
    `INSERT OR REPLACE INTO iterations (run_id, iteration, status, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(runId, iteration, status, new Date().toISOString());
  db.close();
}

export function getLatestIteration(runId: string): number {
  const db = openDb();
  const row = db
    .prepare(`SELECT MAX(iteration) AS latest FROM iterations WHERE run_id = ?`)
    .get(runId) as { latest: number | null };
  db.close();
  return row.latest ?? -1;
}
