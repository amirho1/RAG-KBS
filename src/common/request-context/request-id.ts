import { randomUUID } from "node:crypto";
import type { Response } from "express";
import type {
  RequestContext,
  RequestWithContext,
} from "./request-context.types.js";

const requestIdHeader = "x-request-id";
const generatedRequestIdPrefix = "req_";
const maxRequestIdLength = 128;
const safeRequestIdPattern = /^[A-Za-z0-9._:-]+$/;

/**
 * Check whether a request ID is safe to propagate.
 * @param requestId - Candidate request ID.
 * @returns True when the request ID is safe.
 */
export function isSafeRequestId(requestId: string): boolean {
  return (
    requestId.length > 0 &&
    requestId.length <= maxRequestIdLength &&
    safeRequestIdPattern.test(requestId)
  );
}

/**
 * Generate a new request ID.
 * @returns A generated request ID.
 */
export function generateRequestId(): string {
  return `${generatedRequestIdPrefix}${randomUUID()}`;
}

/**
 * Resolve a request ID from an incoming header value.
 * @param headerValue - Incoming x-request-id header value.
 * @returns A safe request ID.
 */
export function resolveRequestId(
  headerValue: string | string[] | undefined
): string {
  const candidate = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (candidate && isSafeRequestId(candidate)) {
    return candidate;
  }

  return generateRequestId();
}

/**
 * Build the request context stored for the current async flow.
 * @param request - Express request.
 * @returns The request context.
 */
export function buildRequestContext(
  request: RequestWithContext
): RequestContext {
  return {
    requestId: request.requestId ?? generateRequestId(),
    method: request.method,
    path: request.originalUrl ?? request.url,
  };
}

/**
 * Attach a request ID to the request and response.
 * @param request - Express request.
 * @param response - Express response.
 * @returns The attached request ID.
 */
export function attachRequestId(
  request: RequestWithContext,
  response?: Response
): string {
  const existingRequestId = request.requestId;
  const requestId = existingRequestId
    ? existingRequestId
    : resolveRequestId(request.headers[requestIdHeader]);

  request.requestId = requestId;

  if (response) {
    response.setHeader(requestIdHeader, requestId);
  }

  return requestId;
}

export { requestIdHeader };
