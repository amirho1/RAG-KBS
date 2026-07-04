import { Inject, Injectable, type LoggerService } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import pino, { type Logger, type LoggerOptions } from "pino";
import loggerConfig from "../../config/logger.config.js";
import {
  redactSensitiveValue,
  sanitizeError,
  sanitizeLogMessage,
} from "./log-redaction.js";
import { createDailyRotatingLogStream } from "./daily-rotating-log-stream.js";

type StructuredLogLevel =
  "fatal" | "error" | "warn" | "info" | "debug" | "trace";

/**
 * Nest logger backed by Pino structured logs.
 */
@Injectable()
export class PinoLoggerService implements LoggerService {
  private readonly logger: Logger;

  constructor(
    @Inject(loggerConfig.KEY)
    private readonly config: ConfigType<typeof loggerConfig>
  ) {
    this.logger = createPinoLogger(config);
  }

  /**
   * Get the underlying Pino logger.
   * @returns Pino logger instance.
   */
  getLogger(): Logger {
    return this.logger;
  }

  /**
   * Write an info-level Nest log.
   * @param message - Log message or payload.
   * @param optionalParams - Optional Nest log params.
   */
  log(message: unknown, ...optionalParams: unknown[]): void {
    this.writeNestLog("info", message, optionalParams);
  }

  /**
   * Write an error-level Nest log.
   * @param message - Log message or payload.
   * @param optionalParams - Optional Nest log params.
   */
  error(message: unknown, ...optionalParams: unknown[]): void {
    this.writeNestLog("error", message, optionalParams);
  }

  /**
   * Write a warning-level Nest log.
   * @param message - Log message or payload.
   * @param optionalParams - Optional Nest log params.
   */
  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.writeNestLog("warn", message, optionalParams);
  }

  /**
   * Write a debug-level Nest log.
   * @param message - Log message or payload.
   * @param optionalParams - Optional Nest log params.
   */
  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.writeNestLog("debug", message, optionalParams);
  }

  /**
   * Write a verbose-level Nest log.
   * @param message - Log message or payload.
   * @param optionalParams - Optional Nest log params.
   */
  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.writeNestLog("trace", message, optionalParams);
  }

  /**
   * Write a fatal-level Nest log.
   * @param message - Log message or payload.
   * @param optionalParams - Optional Nest log params.
   */
  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.writeNestLog("fatal", message, optionalParams);
  }

  /**
   * Write a structured info log.
   * @param payload - Structured log payload.
   * @param message - Optional log message.
   */
  info(payload: Record<string, unknown>, message?: string): void {
    this.writeStructuredLog("info", payload, message);
  }

  /**
   * Write a structured warning log.
   * @param payload - Structured log payload.
   * @param message - Optional log message.
   */
  warnPayload(payload: Record<string, unknown>, message?: string): void {
    this.writeStructuredLog("warn", payload, message);
  }

  /**
   * Write a structured error log.
   * @param payload - Structured log payload.
   * @param message - Optional log message.
   */
  errorPayload(payload: Record<string, unknown>, message?: string): void {
    this.writeStructuredLog("error", payload, message);
  }

  /**
   * Write a structured debug log.
   * @param payload - Structured log payload.
   * @param message - Optional log message.
   */
  debugPayload(payload: Record<string, unknown>, message?: string): void {
    this.writeStructuredLog("debug", payload, message);
  }

  /**
   * Write a Nest-compatible log entry.
   * @param level - Log level.
   * @param message - Log message or payload.
   * @param optionalParams - Optional Nest log params.
   */
  private writeNestLog(
    level: StructuredLogLevel,
    message: unknown,
    optionalParams: unknown[]
  ): void {
    const payload = normalizeNestLogPayload(message, optionalParams);
    this.writeStructuredLog(level, payload, getPayloadMessage(payload));
  }

  /**
   * Write a structured log entry.
   * @param level - Log level.
   * @param payload - Structured log payload.
   * @param message - Optional log message.
   */
  private writeStructuredLog(
    level: StructuredLogLevel,
    payload: Record<string, unknown>,
    message?: string
  ): void {
    const safePayload = redactSensitiveValue(payload) as Record<
      string,
      unknown
    >;
    const safeMessage = message ? sanitizeLogMessage(message) : undefined;

    switch (level) {
      case "fatal":
        this.logger.fatal(safePayload, safeMessage);
        return;
      case "error":
        this.logger.error(safePayload, safeMessage);
        return;
      case "warn":
        this.logger.warn(safePayload, safeMessage);
        return;
      case "debug":
        this.logger.debug(safePayload, safeMessage);
        return;
      case "trace":
        this.logger.trace(safePayload, safeMessage);
        return;
      case "info":
      default:
        this.logger.info(safePayload, safeMessage);
    }
  }
}

/**
 * Create the Pino logger instance.
 * @param config - Logger config.
 * @returns Pino logger instance.
 */
export function createPinoLogger(
  config: ConfigType<typeof loggerConfig>
): Logger {
  const logStream = createDailyRotatingLogStream({
    logDir: config.logDir,
    rotationEnabled: config.rotationEnabled,
    retentionDays: config.retentionDays,
  });
  const options: LoggerOptions = {
    level: config.level,
    base: {
      serviceName: config.serviceName,
      environment: config.environment,
      version: config.version || undefined,
    },
    redact: {
      paths: [
        "authorization",
        "headers.authorization",
        "headers.cookie",
        "cookie",
        "password",
        "*.password",
        "*.secret",
        "*.token",
        "*.apiKey",
        "*.api_key",
        "*.accessKey",
        "*.access_key",
        "*.databaseUrl",
        "*.database_url",
      ],
      censor: "[redacted]",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  return pino(options, logStream);
}

/**
 * Normalize Nest logger calls into a structured payload.
 * @param message - Log message or payload.
 * @param optionalParams - Optional Nest log params.
 * @returns A structured log payload.
 */
function normalizeNestLogPayload(
  message: unknown,
  optionalParams: unknown[]
): Record<string, unknown> {
  const context = getLogContext(optionalParams);

  if (message instanceof Error) {
    return {
      message: sanitizeError(message).message,
      error: sanitizeError(message),
      ...(context ? { context } : {}),
    };
  }

  if (typeof message === "object" && message !== null) {
    return {
      ...(redactSensitiveValue(message) as Record<string, unknown>),
      ...(context ? { context } : {}),
    };
  }

  return {
    message: sanitizeLogMessage(String(message)),
    ...(context ? { context } : {}),
  };
}

/**
 * Get the Nest logger context from optional params.
 * @param optionalParams - Optional Nest log params.
 * @returns The context value, if present.
 */
function getLogContext(optionalParams: unknown[]): string | undefined {
  const lastParam = optionalParams.at(-1);

  return typeof lastParam === "string" ? lastParam : undefined;
}

/**
 * Get a safe message from a structured payload.
 * @param payload - Structured log payload.
 * @returns The payload message, if one exists.
 */
function getPayloadMessage(
  payload: Record<string, unknown>
): string | undefined {
  return typeof payload.message === "string" ? payload.message : undefined;
}
