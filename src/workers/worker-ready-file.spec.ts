import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeWorkerReadyFile } from "./worker-ready-file.js";

describe("writeWorkerReadyFile", () => {
  const readyDirectory = join(tmpdir(), "rag-kbs-worker-ready-test");
  const readyFilePath = join(readyDirectory, "worker.ready");

  beforeEach(async () => {
    await rm(readyDirectory, { force: true, recursive: true });
    await mkdir(readyDirectory, { recursive: true });
  });

  afterEach(async () => {
    await rm(readyDirectory, { force: true, recursive: true });
  });

  it("should write the readiness timestamp when a path is provided", async () => {
    await writeWorkerReadyFile(readyFilePath);

    const fileContent = await readFile(readyFilePath, "utf8");

    expect(Number.isNaN(Date.parse(fileContent))).toBe(false);
  });

  it("should skip writing when no path is provided", async () => {
    await expect(writeWorkerReadyFile(undefined)).resolves.toBeUndefined();
  });
});
