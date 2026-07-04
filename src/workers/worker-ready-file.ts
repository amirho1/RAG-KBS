import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Write the worker readiness file used by Docker health checks.
 * @param filePath - The optional readiness file path.
 */
export async function writeWorkerReadyFile(
  filePath: string | undefined
): Promise<void> {
  if (!filePath) {
    return;
  }

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, new Date().toISOString(), "utf8");
}
