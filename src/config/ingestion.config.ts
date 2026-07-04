import { registerAs } from "@nestjs/config";
import { getValidatedEnv } from "./validated-env.js";

/**
 * Ingestion pipeline configuration namespace.
 */
export default registerAs("ingestion", () => {
  const env = getValidatedEnv();

  return {
    queueName: env.INGESTION_QUEUE_NAME,
    concurrency: env.INGESTION_CONCURRENCY,
    maxUploadSizeMb: env.MAX_UPLOAD_SIZE_MB,
  };
});
