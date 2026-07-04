import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  type WriteStream,
} from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { Writable } from "node:stream";

export type DailyRotatingLogStreamOptions = {
  logDir: string;
  rotationEnabled: boolean;
  retentionDays: number;
  now?: () => Date;
};

const errorLogLevel = 50;
const appLogPrefix = "app";
const errorLogPrefix = "error";
const logFileExtension = ".log";
const datedLogFilePattern = /^(app|error)-(\d{4}-\d{2}-\d{2})\.log$/;

/**
 * Create a writable stream that stores application logs in daily files.
 * @param options - Rotating log stream options.
 * @returns A daily rotating log stream.
 */
export function createDailyRotatingLogStream(
  options: DailyRotatingLogStreamOptions
): DailyRotatingLogStream {
  return new DailyRotatingLogStream(options);
}

/**
 * Writable stream that separates general and error logs into date-based files.
 */
export class DailyRotatingLogStream extends Writable {
  private readonly logDir: string;
  private readonly rotationEnabled: boolean;
  private readonly retentionDays: number;
  private readonly now: () => Date;
  private currentLogKey: string | undefined;
  private appStream: WriteStream | undefined;
  private errorStream: WriteStream | undefined;

  constructor(options: DailyRotatingLogStreamOptions) {
    super();

    this.logDir = resolveLogDir(options.logDir);
    this.rotationEnabled = options.rotationEnabled;
    this.retentionDays = options.retentionDays;
    this.now = options.now ?? (() => new Date());

    mkdirSync(this.logDir, { recursive: true });
    this.rotateIfNeeded();
  }

  /**
   * Write a Pino log chunk to the current log files.
   * @param chunk - Log chunk.
   * @param encoding - Buffer encoding.
   * @param callback - Write completion callback.
   */
  override _write(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    try {
      this.rotateIfNeeded();
      this.writeLogLines(String(chunk));
      callback();
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Close active log file streams.
   * @param callback - Finalization callback.
   */
  override _final(callback: (error?: Error | null) => void): void {
    const streams = [this.appStream, this.errorStream].filter(
      (stream): stream is WriteStream => stream !== undefined
    );

    if (streams.length === 0) {
      callback();
      return;
    }

    let remainingStreams = streams.length;
    let callbackCalled = false;

    const complete = (error?: Error | null) => {
      if (callbackCalled) {
        return;
      }

      if (error) {
        callbackCalled = true;
        callback(error);
        return;
      }

      remainingStreams -= 1;

      if (remainingStreams === 0) {
        callbackCalled = true;
        callback();
      }
    };

    for (const stream of streams) {
      stream.once("error", complete);
      stream.end(() => {
        complete();
      });
    }
  }

  /**
   * Rotate file streams when the target log date changes.
   */
  private rotateIfNeeded(): void {
    const nextLogKey = this.getLogKey();

    if (nextLogKey === this.currentLogKey) {
      return;
    }

    this.appStream?.end();
    this.errorStream?.end();

    this.currentLogKey = nextLogKey;
    this.appStream = this.createFileStream(appLogPrefix, nextLogKey);
    this.errorStream = this.createFileStream(errorLogPrefix, nextLogKey);
    this.deleteExpiredLogs();
  }

  /**
   * Write each log line to its destination file.
   * @param chunk - Pino log chunk.
   */
  private writeLogLines(chunk: string): void {
    const lines = chunk.match(/[^\n]*\n|[^\n]+/g) ?? [];

    for (const line of lines) {
      if (line.trim().length === 0) {
        continue;
      }

      if (isErrorLogLine(line)) {
        this.errorStream?.write(line);
        continue;
      }

      this.appStream?.write(line);
    }
  }

  /**
   * Create a write stream for a log file.
   * @param prefix - Log file prefix.
   * @param logKey - Current log key.
   * @returns A write stream.
   */
  private createFileStream(prefix: string, logKey: string): WriteStream {
    const fileName = this.rotationEnabled
      ? `${prefix}-${logKey}${logFileExtension}`
      : `${prefix}${logFileExtension}`;
    const stream = createWriteStream(join(this.logDir, fileName), {
      flags: "a",
    });

    stream.on("error", (error) => {
      this.emit("error", error);
    });

    return stream;
  }

  /**
   * Get the active date-based log key.
   * @returns The active log key.
   */
  private getLogKey(): string {
    if (!this.rotationEnabled) {
      return "static";
    }

    return formatDateKey(this.now());
  }

  /**
   * Delete rotated log files older than the retention period.
   */
  private deleteExpiredLogs(): void {
    if (
      !this.rotationEnabled ||
      this.retentionDays <= 0 ||
      !existsSync(this.logDir)
    ) {
      return;
    }

    const cutoffDateKey = formatDateKey(
      new Date(this.now().getTime() - this.retentionDays * 24 * 60 * 60 * 1000)
    );

    for (const fileName of readdirSync(this.logDir)) {
      const match = datedLogFilePattern.exec(fileName);

      if (!match) {
        continue;
      }

      const fileDateKey = match[2];

      if (fileDateKey < cutoffDateKey) {
        rmSync(join(this.logDir, fileName), { force: true });
      }
    }
  }
}

/**
 * Resolve a log directory relative to the application working directory.
 * @param logDir - Configured log directory.
 * @returns Absolute log directory path.
 */
function resolveLogDir(logDir: string): string {
  return isAbsolute(logDir) ? logDir : resolve(process.cwd(), logDir);
}

/**
 * Determine whether a Pino JSON line is an error-level log.
 * @param line - Pino JSON log line.
 * @returns True when the line is an error or fatal log.
 */
function isErrorLogLine(line: string): boolean {
  try {
    const payload = JSON.parse(line) as { level?: unknown };

    return typeof payload.level === "number" && payload.level >= errorLogLevel;
  } catch {
    return false;
  }
}

/**
 * Format a date as YYYY-MM-DD.
 * @param date - Date to format.
 * @returns The date key.
 */
function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
