/**
 * Health check status values.
 */
export type HealthStatus = "ok" | "error";

/**
 * Result of a single dependency health check.
 */
export interface DependencyHealthResult {
  status: HealthStatus;
  dependency: string;
  latencyMs?: number;
  message?: string;
  timestamp: string;
}

/**
 * Liveness probe response.
 */
export interface LivenessResult {
  status: HealthStatus;
  service: string;
  timestamp: string;
  uptimeSeconds: number;
}

/**
 * Readiness probe response.
 */
export interface ReadinessResult {
  status: HealthStatus;
  dependencies: DependencyResultsMap;
  timestamp: string;
}

/**
 * Map of dependency health results keyed by dependency name.
 */
export type DependencyResultsMap = {
  postgres?: DependencyHealthResult;
  redis?: DependencyHealthResult;
  qdrant?: DependencyHealthResult;
  storage?: DependencyHealthResult;
  queue?: DependencyHealthResult;
};

/**
 * Overall health summary response.
 */
export interface OverallHealthResult {
  status: HealthStatus;
  service: string;
  environment: string;
  version?: string;
  uptimeSeconds: number;
  timestamp: string;
  dependencies: DependencyResultsMap;
}

/**
 * Supported dependency names for health checks.
 */
export type DependencyName =
  "postgres" | "redis" | "qdrant" | "storage" | "queue";
