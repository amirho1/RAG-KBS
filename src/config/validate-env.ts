import { ZodError } from "zod";
import { envSchema, type Env } from "./env.schema.js";
import { setValidatedEnv } from "./validated-env.js";

/**
 * Format Zod validation errors into a readable startup message.
 * @param error - The Zod validation error.
 * @returns A multi-line error message.
 */
export function formatEnvValidationError(error: ZodError): string {
  const issueLines = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "environment";
    return `- ${path}: ${issue.message}`;
  });

  return ["Environment validation failed:", ...issueLines].join("\n");
}

/**
 * Validate environment variables at application startup.
 * @param config - Raw environment variables loaded by ConfigModule.
 * @returns Parsed and validated environment variables.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(formatEnvValidationError(result.error));
  }

  setValidatedEnv(result.data);
  return result.data;
}
