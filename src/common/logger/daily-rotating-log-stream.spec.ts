import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createDailyRotatingLogStream } from "./daily-rotating-log-stream.js";

describe("DailyRotatingLogStream", () => {
  it("should write non-error and error logs to separate daily files", async () => {
    const logDir = createTempLogDir();
    const stream = createDailyRotatingLogStream({
      logDir,
      rotationEnabled: true,
      retentionDays: 14,
      now: () => new Date("2026-07-04T10:00:00.000Z"),
    });

    await writeLogLine(stream, { level: 30, msg: "request completed" });
    await writeLogLine(stream, { level: 50, msg: "request failed" });
    await closeLogStream(stream);

    const appLog = readFileSync(join(logDir, "app-2026-07-04.log"), "utf8");
    const errorLog = readFileSync(join(logDir, "error-2026-07-04.log"), "utf8");

    expect(appLog).toContain("request completed");
    expect(appLog).not.toContain("request failed");
    expect(errorLog).toContain("request failed");
  });

  it("should rotate files when the date changes", async () => {
    const logDir = createTempLogDir();
    let now = new Date("2026-07-04T23:59:59.000Z");
    const stream = createDailyRotatingLogStream({
      logDir,
      rotationEnabled: true,
      retentionDays: 14,
      now: () => now,
    });

    await writeLogLine(stream, { level: 30, msg: "day one" });
    now = new Date("2026-07-05T00:00:01.000Z");
    await writeLogLine(stream, { level: 30, msg: "day two" });
    await closeLogStream(stream);

    expect(existsSync(join(logDir, "app-2026-07-04.log"))).toBe(true);
    expect(existsSync(join(logDir, "app-2026-07-05.log"))).toBe(true);
  });

  it("should delete rotated logs older than retention", async () => {
    const logDir = createTempLogDir();
    writeFileSync(join(logDir, "app-2026-06-01.log"), "old\n");
    writeFileSync(join(logDir, "error-2026-06-01.log"), "old\n");

    const stream = createDailyRotatingLogStream({
      logDir,
      rotationEnabled: true,
      retentionDays: 14,
      now: () => new Date("2026-07-04T10:00:00.000Z"),
    });
    await writeLogLine(stream, { level: 30, msg: "current" });
    await closeLogStream(stream);

    expect(existsSync(join(logDir, "app-2026-06-01.log"))).toBe(false);
    expect(existsSync(join(logDir, "error-2026-06-01.log"))).toBe(false);
    expect(existsSync(join(logDir, "app-2026-07-04.log"))).toBe(true);
  });

  it("should use stable file names when rotation is disabled", async () => {
    const logDir = createTempLogDir();
    const stream = createDailyRotatingLogStream({
      logDir,
      rotationEnabled: false,
      retentionDays: 14,
      now: () => new Date("2026-07-04T10:00:00.000Z"),
    });

    await writeLogLine(stream, { level: 30, msg: "stable" });
    await closeLogStream(stream);

    expect(existsSync(join(logDir, "app.log"))).toBe(true);
    expect(existsSync(join(logDir, "error.log"))).toBe(true);
  });
});

/**
 * Create a temporary log directory for tests.
 * @returns Temporary log directory path.
 */
function createTempLogDir(): string {
  return mkdtempSync(join(tmpdir(), "rag-kbs-log-stream-"));
}

/**
 * Write a JSON log line to the stream.
 * @param stream - Log stream.
 * @param payload - Log payload.
 */
async function writeLogLine(
  stream: NodeJS.WritableStream,
  payload: Record<string, unknown>
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    stream.write(`${JSON.stringify(payload)}\n`, (error?: Error | null) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

/**
 * Close a log stream.
 * @param stream - Log stream.
 */
async function closeLogStream(stream: NodeJS.WritableStream): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    stream.end((error?: Error | null) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
