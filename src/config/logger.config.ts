import { registerAs } from "@nestjs/config";
import { getValidatedEnv } from "./validated-env.js";

/**
 * Structured logger configuration namespace.
 */
export default registerAs("logger", () => {
  const env = getValidatedEnv();

  return {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
    logDir: env.LOG_DIR,
    rotationEnabled: env.LOG_ROTATION_ENABLED,
    retentionDays: env.LOG_RETENTION_DAYS,
    requestLoggingEnabled: env.REQUEST_LOGGING_ENABLED,
    requestBodyLoggingEnabled: env.REQUEST_BODY_LOGGING_ENABLED,
    environment: env.NODE_ENV,
    serviceName: env.SERVICE_NAME,
    version: env.APP_VERSION,
  };
});
