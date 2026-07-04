import type { ConfigType } from "@nestjs/config";
import type { Request, Response } from "express";
import loggerConfig from "../../config/logger.config.js";
import type { SafeErrorSummary } from "./log-redaction.js";
import { redactSensitiveValue } from "./log-redaction.js";

export type RequestLogPayloadInput = {
  request: Request & { requestId?: string };
  response: Response;
  durationMs: number;
  config: ConfigType<typeof loggerConfig>;
  errorSummary?: SafeErrorSummary;
};

/**
 * Build a structured request log payload.
 * @param input - Request log input.
 * @returns A structured request log payload.
 */
export function buildRequestLogPayload(
  input: RequestLogPayloadInput
): Record<string, unknown> {
  const contentLength = getHeaderValue(
    input.response.getHeader("content-length")
  );
  const requestBody = input.config.requestBodyLoggingEnabled
    ? redactSensitiveValue(input.request.body)
    : undefined;

  return removeUndefinedValues({
    event: "http.request",
    requestId: input.request.requestId,
    method: input.request.method,
    path: input.request.originalUrl ?? input.request.url,
    statusCode: input.response.statusCode,
    durationMs: input.durationMs,
    userAgent: input.request.headers["user-agent"],
    ip: input.request.ip ?? input.request.socket.remoteAddress,
    contentLength,
    error: input.errorSummary,
    serviceName: input.config.serviceName,
    environment: input.config.environment,
    requestBody,
  });
}

/**
 * Read a response header value safely.
 * @param value - Header value.
 * @returns The header value as a string.
 */
function getHeaderValue(
  value: number | string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value.join(",");
  }

  if (typeof value === "number") {
    return String(value);
  }

  return value;
}

/**
 * Remove undefined properties from a log payload.
 * @param value - Payload with optional properties.
 * @returns Payload without undefined properties.
 */
function removeUndefinedValues(
  value: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter((entry) => entry[1] !== undefined)
  );
}
