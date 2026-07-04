import type { ConfigType } from "@nestjs/config";
import type { Request, Response } from "express";
import loggerConfig from "../../config/logger.config.js";
import { buildRequestLogPayload } from "./request-log-payload.js";

describe("request log payload", () => {
  it("should include request metadata and omit bodies by default", () => {
    const payload = buildRequestLogPayload({
      request: createRequest({ body: { password: "secret" } }),
      response: createResponse(201, "42"),
      durationMs: 12.5,
      config: createLoggerConfig(false),
    });

    expect(payload).toEqual({
      event: "http.request",
      requestId: "req_test",
      method: "POST",
      path: "/api/v1/sources",
      statusCode: 201,
      durationMs: 12.5,
      userAgent: "jest",
      ip: "127.0.0.1",
      contentLength: "42",
      serviceName: "rag-kbs-api",
      environment: "test",
    });
  });

  it("should redact request body summaries when body logging is enabled", () => {
    const payload = buildRequestLogPayload({
      request: createRequest({
        body: {
          name: "source",
          apiKey: "secret",
          rawText: "large document text",
        },
      }),
      response: createResponse(200),
      durationMs: 5,
      config: createLoggerConfig(true),
    });

    expect(payload.requestBody).toEqual({
      name: "source",
      apiKey: "[redacted]",
      rawText: "[redacted]",
    });
  });
});

/**
 * Create a logger config fixture.
 * @param requestBodyLoggingEnabled - Whether body logging is enabled.
 * @returns Logger config fixture.
 */
function createLoggerConfig(
  requestBodyLoggingEnabled: boolean
): ConfigType<typeof loggerConfig> {
  return {
    level: "info",
    format: "json",
    requestLoggingEnabled: true,
    requestBodyLoggingEnabled,
    environment: "test",
    serviceName: "rag-kbs-api",
    version: "",
  };
}

/**
 * Create an Express request fixture.
 * @param overrides - Request overrides.
 * @returns Request fixture.
 */
function createRequest(overrides: Partial<Request> = {}) {
  return {
    requestId: "req_test",
    method: "POST",
    originalUrl: "/api/v1/sources",
    url: "/api/v1/sources",
    headers: {
      "user-agent": "jest",
    },
    ip: "127.0.0.1",
    socket: {
      remoteAddress: "127.0.0.1",
    },
    ...overrides,
  } as Request & { requestId: string };
}

/**
 * Create an Express response fixture.
 * @param statusCode - HTTP status code.
 * @param contentLength - Response content length.
 * @returns Response fixture.
 */
function createResponse(statusCode: number, contentLength?: string) {
  return {
    statusCode,
    getHeader(header: string) {
      return header === "content-length" ? contentLength : undefined;
    },
  } as Response;
}
