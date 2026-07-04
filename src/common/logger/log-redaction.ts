export type SafeErrorSummary = {
  name: string;
  message: string;
  code?: string;
};

const maxStringLength = 1_000;
const maxDepth = 5;
const redactedValue = "[redacted]";
const sensitiveExactKeys = new Set([
  "authorization",
  "cookie",
  "setcookie",
  "password",
  "secret",
  "token",
  "apikey",
  "accesskey",
  "credential",
  "databaseurl",
  "connectionstring",
  "embedding",
  "embeddings",
  "rawtext",
  "documenttext",
  "chunktext",
  "filecontent",
  "uploadedfile",
  "extractedtext",
  "body",
  "content",
]);

const sensitiveKeyFragments = [
  "password",
  "secret",
  "token",
  "apikey",
  "accesskey",
  "credential",
  "embedding",
];

/**
 * Sanitize a log message by redacting common secret shapes.
 * @param message - Message to sanitize.
 * @returns The sanitized message.
 */
export function sanitizeLogMessage(message: string): string {
  return message
    .replace(
      /(postgresql|postgres|redis|amqp|mongodb|mysql):\/\/\S+/gi,
      "[redacted-connection-string]"
    )
    .replace(/(bearer|basic)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [redacted]")
    .replace(/(password|secret|token|api[_-]?key)=\S+/gi, "$1=[redacted]")
    .replace(/AKIA[0-9A-Z]{16}/g, redactedValue)
    .replace(/[A-Za-z0-9/+=]{48,}/g, redactedValue);
}

/**
 * Redact sensitive values from structured log payloads.
 * @param value - Value to redact.
 * @param depth - Current traversal depth.
 * @returns A safe value for logs.
 */
export function redactSensitiveValue(value: unknown, depth = 0): unknown {
  if (depth > maxDepth) {
    return "[max-depth]";
  }

  if (typeof value === "string") {
    return truncateString(sanitizeLogMessage(value));
  }

  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Error) {
    return sanitizeError(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const safeObject: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>
    )) {
      if (isSensitiveLogKey(key)) {
        safeObject[key] = redactedValue;
        continue;
      }

      safeObject[key] = redactSensitiveValue(nestedValue, depth + 1);
    }

    return safeObject;
  }

  return undefined;
}

/**
 * Build a safe error summary for responses and logs.
 * @param error - Caught error value.
 * @param fallbackMessage - Message used when no safe error message exists.
 * @returns A safe error summary.
 */
export function sanitizeError(
  error: unknown,
  fallbackMessage = "Internal server error"
): SafeErrorSummary {
  if (!(error instanceof Error)) {
    return {
      name: "Error",
      message: fallbackMessage,
    };
  }

  const message = sanitizeLogMessage(error.message).trim();
  const code = getErrorCode(error);

  return {
    name: error.name || "Error",
    message: message.length > 0 ? message : fallbackMessage,
    ...(code ? { code } : {}),
  };
}

/**
 * Determine whether an object key is considered sensitive.
 * @param key - Object key.
 * @returns True when the key must be redacted.
 */
export function isSensitiveLogKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (sensitiveExactKeys.has(normalizedKey)) {
    return true;
  }

  return sensitiveKeyFragments.some((fragment) =>
    normalizedKey.includes(fragment)
  );
}

/**
 * Truncate very large strings before logging.
 * @param value - String value.
 * @returns A bounded string.
 */
function truncateString(value: string): string {
  if (value.length <= maxStringLength) {
    return value;
  }

  return `${value.slice(0, maxStringLength)}...[truncated]`;
}

/**
 * Read a conventional error code safely.
 * @param error - Error object.
 * @returns The error code, if present.
 */
function getErrorCode(error: Error): string | undefined {
  const code = (error as Error & { code?: unknown }).code;

  return typeof code === "string" ? code : undefined;
}
