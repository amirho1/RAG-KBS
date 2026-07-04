/**
 * Sanitize an error message for safe health check responses.
 * @param error - The caught error value.
 * @param fallbackMessage - Message returned when sanitization removes all details.
 * @returns A safe error message without secrets or connection strings.
 */
export function sanitizeHealthError(
  error: unknown,
  fallbackMessage: string
): string {
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  let message = error.message;

  if (shouldUseFallbackMessage(message)) {
    return fallbackMessage;
  }

  message = message.replace(
    /(postgresql|postgres|redis|amqp|mongodb):\/\/\S+/gi,
    "[redacted-connection-string]"
  );
  message = message.replace(
    /(AKIA[0-9A-Z]{16}|[A-Za-z0-9/+=]{40,})/g,
    "[redacted-secret]"
  );
  message = message.replace(/password[=:]\S+/gi, "password=[redacted]");
  message = message.replace(/\bat\s+.+$/gm, "").trim();

  if (message.length === 0) {
    return fallbackMessage;
  }

  return message;
}

/**
 * Determine whether an error is too noisy or implementation-specific for health logs.
 * @param message - The original error message.
 * @returns True when the fallback message should be used.
 */
function shouldUseFallbackMessage(message: string): boolean {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("invalid `prisma.") ||
    normalizedMessage.includes("raw query failed") ||
    normalizedMessage.includes("can't reach database server") ||
    normalizedMessage.includes("can’t reach database server")
  );
}
