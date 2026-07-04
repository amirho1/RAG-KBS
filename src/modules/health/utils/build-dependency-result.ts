import type { DependencyHealthResult } from "../types/health.types.js";

/**
 * Build a successful dependency health result.
 * @param dependency - Dependency name.
 * @param latencyMs - Measured latency in milliseconds.
 * @returns A successful dependency health result.
 */
export function buildOkDependencyResult(
  dependency: string,
  latencyMs: number
): DependencyHealthResult {
  return {
    status: "ok",
    dependency,
    latencyMs,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build a failed dependency health result.
 * @param dependency - Dependency name.
 * @param message - Safe error message.
 * @returns A failed dependency health result.
 */
export function buildErrorDependencyResult(
  dependency: string,
  message: string
): DependencyHealthResult {
  return {
    status: "error",
    dependency,
    message,
    timestamp: new Date().toISOString(),
  };
}
