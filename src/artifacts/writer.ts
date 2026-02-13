import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export async function writeArtifact(runId: string, iteration: number, name: string, data: unknown): Promise<string> {
  const path = join("artifacts", runId, String(iteration), name);
  await mkdir(dirname(path), { recursive: true });
  const json = JSON.stringify(data, null, 2) + "\n";
  await writeFile(path, json, "utf8");
  return path;
}
