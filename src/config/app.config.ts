import { registerAs } from "@nestjs/config";
import { resolveAppVersion } from "./app-version.js";
import { getValidatedEnv } from "./validated-env.js";

/**
 * Application-level configuration namespace.
 */
export default registerAs("app", () => {
  const env = getValidatedEnv();

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    workerReadyFile: env.WORKER_READY_FILE,
    serviceName: env.SERVICE_NAME,
    version:
      env.APP_VERSION.trim().length > 0 ? env.APP_VERSION : resolveAppVersion(),
  };
});
