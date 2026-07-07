import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { STATUS_CODES } from "node:http";
import { ZodValidationException } from "nestjs-zod";
import { z } from "zod";
import {
  attachRequestId,
  generateRequestId,
} from "../request-context/request-id.js";
import { RequestContextService } from "../request-context/request-context.service.js";
import type { RequestWithContext } from "../request-context/request-context.types.js";
import {
  sanitizeError,
  sanitizeLogMessage,
  type SafeErrorSummary,
} from "../logger/log-redaction.js";

export type ValidationErrorDetail = {
  field: string;
  message: string;
};

type ErrorResponseBody = {
  statusCode: number;
  error: string;
  message: string;
  errorCode?: string;
  details?: ValidationErrorDetail[];
  requestId: string;
  timestamp: string;
  path: string;
};

/**
 * Formats all uncaught HTTP errors into safe API responses.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly requestContextService: RequestContextService) {}

  /**
   * Catch and format an exception.
   * @param exception - Caught exception.
   * @param host - Nest arguments host.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const request = httpContext.getRequest<RequestWithContext>();
    const response = httpContext.getResponse<Response>();
    const statusCode = getHttpStatusCode(exception);
    const details = getValidationDetails(exception);
    const message = getResponseMessage(exception, statusCode, details);
    const errorCode = getSafeErrorCode(exception);
    const requestId =
      request.requestId ??
      this.requestContextService.getRequestId() ??
      generateRequestId();

    request.requestId = requestId;
    attachRequestId(request, response);

    const errorSummary = getErrorSummary(exception, statusCode, message);
    setResponseErrorSummary(response, errorSummary);

    const body: ErrorResponseBody = {
      statusCode,
      error: STATUS_CODES[statusCode] ?? "Error",
      message,
      ...(errorCode ? { errorCode } : {}),
      ...(details.length > 0 ? { details } : {}),
      requestId,
      timestamp: new Date().toISOString(),
      path: getRequestPath(request),
    };

    response.status(statusCode).json(body);
  }
}

/**
 * Get an explicit safe error code from an HTTP exception response.
 * @param exception - Caught exception.
 * @returns Safe error code.
 */
function getSafeErrorCode(exception: unknown): string | undefined {
  if (!(exception instanceof HttpException)) {
    return undefined;
  }

  const response = exception.getResponse();

  if (
    typeof response === "object" &&
    response !== null &&
    "errorCode" in response &&
    typeof response.errorCode === "string"
  ) {
    return sanitizeLogMessage(response.errorCode);
  }

  return undefined;
}

/**
 * Get the HTTP status code for an exception.
 * @param exception - Caught exception.
 * @returns HTTP status code.
 */
function getHttpStatusCode(exception: unknown): number {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
}

/**
 * Get validation details from supported validation exceptions.
 * @param exception - Caught exception.
 * @returns Safe validation details.
 */
function getValidationDetails(exception: unknown): ValidationErrorDetail[] {
  if (exception instanceof ZodValidationException) {
    return formatZodIssues(exception.getZodError());
  }

  if (exception instanceof HttpException) {
    const response = exception.getResponse();

    if (
      typeof response === "object" &&
      response !== null &&
      "errors" in response
    ) {
      return formatZodIssues(response.errors);
    }
  }

  return [];
}

/**
 * Format Zod issues for API responses.
 * @param error - Zod error or issue list.
 * @returns Safe validation details.
 */
function formatZodIssues(error: unknown): ValidationErrorDetail[] {
  const issues = getZodIssues(error);

  return issues.flatMap((issue) => {
    if (issue.code === "unrecognized_keys") {
      return issue.keys.map((key) => ({
        field: buildIssueField([...issue.path, key]),
        message: sanitizeLogMessage(`Unknown field: ${key}`),
      }));
    }

    return [
      {
        field: buildIssueField(issue.path),
        message: sanitizeLogMessage(issue.message),
      },
    ];
  });
}

/**
 * Extract Zod issues from an unknown value.
 * @param error - Zod error, issue list, or unknown value.
 * @returns Zod issues.
 */
function getZodIssues(error: unknown): z.core.$ZodIssue[] {
  if (error instanceof z.ZodError) {
    return error.issues;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray(error.issues)
  ) {
    return (error as { issues: z.core.$ZodIssue[] }).issues;
  }

  if (Array.isArray(error)) {
    return error as z.core.$ZodIssue[];
  }

  return [];
}

/**
 * Build a readable validation field path.
 * @param path - Zod issue path.
 * @returns Field path.
 */
function buildIssueField(path: PropertyKey[]): string {
  return path.length > 0 ? path.map(String).join(".") : "request";
}

/**
 * Get a safe response message.
 * @param exception - Caught exception.
 * @param statusCode - HTTP status code.
 * @param details - Validation details.
 * @returns Safe response message.
 */
function getResponseMessage(
  exception: unknown,
  statusCode: number,
  details: ValidationErrorDetail[]
): string {
  if (details.length > 0) {
    return "Validation failed";
  }

  if (statusCode >= 500) {
    return "Internal server error";
  }

  if (exception instanceof HttpException) {
    const response = exception.getResponse();

    if (typeof response === "string") {
      return sanitizeLogMessage(response);
    }

    if (
      typeof response === "object" &&
      response !== null &&
      "message" in response
    ) {
      const message = response.message;

      if (Array.isArray(message)) {
        return sanitizeLogMessage(message.join("; "));
      }

      if (typeof message === "string") {
        return sanitizeLogMessage(message);
      }
    }
  }

  return STATUS_CODES[statusCode] ?? "Error";
}

/**
 * Build a safe error summary for request logs.
 * @param exception - Caught exception.
 * @param statusCode - HTTP status code.
 * @param message - Safe response message.
 * @returns A safe error summary.
 */
function getErrorSummary(
  exception: unknown,
  statusCode: number,
  message: string
): SafeErrorSummary {
  if (statusCode >= 500) {
    return sanitizeError(exception, message);
  }

  return {
    name: exception instanceof Error ? exception.name : "HttpException",
    message,
  };
}

/**
 * Store a safe error summary for the request logger.
 * @param response - Express response.
 * @param errorSummary - Safe error summary.
 */
function setResponseErrorSummary(
  response: Response,
  errorSummary: SafeErrorSummary
): void {
  const locals = response.locals as Record<string, unknown>;
  locals.errorSummary = errorSummary;
}

/**
 * Get the request path for error responses.
 * @param request - Express request.
 * @returns Request path.
 */
function getRequestPath(request: Request): string {
  return request.originalUrl ?? request.url;
}
