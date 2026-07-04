import type { Env } from "./env.schema.js";

let validatedEnv: Env | undefined;

/**
 * Store the validated environment object for namespace factories.
 * @param env - Parsed and validated environment variables.
 */
export function setValidatedEnv(env: Env): void {
  validatedEnv = env;
}

/**
 * Get the validated environment object.
 * @returns The cached validated environment.
 */
export function getValidatedEnv(): Env {
  if (!validatedEnv) {
    throw new Error(
      "Environment has not been validated yet. Ensure AppConfigModule is loaded."
    );
  }

  return validatedEnv;
}

/**
 * Reset the cached environment. Intended for unit tests only.
 */
export function resetValidatedEnv(): void {
  validatedEnv = undefined;
}
