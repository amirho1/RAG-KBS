import { Inject, Injectable, type NestMiddleware } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import type { NextFunction, Request, Response } from "express";
import loggerConfig from "../../config/logger.config.js";
import { PinoLoggerService } from "../logger/pino-logger.service.js";
import { buildRequestLogPayload } from "../logger/request-log-payload.js";
import {
  attachRequestId,
  buildRequestContext,
} from "../request-context/request-id.js";
import { RequestContextService } from "../request-context/request-context.service.js";
import type { RequestWithContext } from "../request-context/request-context.types.js";

/**
 * Adds request context and emits one structured log per HTTP request.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(
    @Inject(loggerConfig.KEY)
    private readonly config: ConfigType<typeof loggerConfig>,
    private readonly logger: PinoLoggerService,
    private readonly requestContextService: RequestContextService
  ) {}

  /**
   * Handle an HTTP request.
   * @param request - Express request.
   * @param response - Express response.
   * @param next - Next middleware callback.
   */
  use(request: Request, response: Response, next: NextFunction): void {
    const requestWithContext = request as RequestWithContext;
    const startedAt = process.hrtime.bigint();

    attachRequestId(requestWithContext, response);
    requestWithContext.requestContext = buildRequestContext(requestWithContext);

    response.on("finish", () => {
      this.logRequest(requestWithContext, response, startedAt);
    });

    this.requestContextService.run(requestWithContext.requestContext, next);
  }

  /**
   * Write a request log when the response is finished.
   * @param request - Express request.
   * @param response - Express response.
   * @param startedAt - Request start time.
   */
  private logRequest(
    request: RequestWithContext,
    response: Response,
    startedAt: bigint
  ): void {
    if (!this.config.requestLoggingEnabled) {
      return;
    }

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const errorSummary = getResponseErrorSummary(response);
    const payload = buildRequestLogPayload({
      request,
      response,
      durationMs: Number(durationMs.toFixed(3)),
      config: this.config,
      errorSummary,
    });

    if (response.statusCode >= 500) {
      this.logger.errorPayload(payload, "HTTP request failed");
      return;
    }

    if (response.statusCode >= 400) {
      this.logger.warnPayload(payload, "HTTP request completed with error");
      return;
    }

    this.logger.info(payload, "HTTP request completed");
  }
}

/**
 * Get the safe error summary attached by the global exception filter.
 * @param response - Express response.
 * @returns A safe error summary, if one exists.
 */
function getResponseErrorSummary(response: Response) {
  const locals = response.locals as Record<string, unknown>;
  const errorSummary = locals.errorSummary;

  return typeof errorSummary === "object" && errorSummary !== null
    ? (errorSummary as never)
    : undefined;
}
