import { registerAs } from "@nestjs/config";
import { getValidatedEnv } from "./validated-env.js";

/**
 * Health check timeout configuration namespace.
 */
export default registerAs("health", () => {
  const env = getValidatedEnv();

  return {
    postgresTimeoutMs: env.POSTGRES_HEALTH_TIMEOUT_MS,
    redisTimeoutMs: env.REDIS_HEALTH_TIMEOUT_MS,
    qdrantTimeoutMs: env.QDRANT_HEALTH_TIMEOUT_MS,
    storageTimeoutMs: env.STORAGE_HEALTH_TIMEOUT_MS,
    queueTimeoutMs: env.QUEUE_HEALTH_TIMEOUT_MS,
  };
});
