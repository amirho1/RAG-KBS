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
    maxAttempts: env.INGESTION_MAX_ATTEMPTS,
    backoffDelayMs: env.INGESTION_BACKOFF_DELAY_MS,
    removeOnCompleteCount: env.INGESTION_REMOVE_ON_COMPLETE_COUNT,
    removeOnFailCount: env.INGESTION_REMOVE_ON_FAIL_COUNT,
    jobTimeoutMs: env.INGESTION_JOB_TIMEOUT_MS,
    maxTextContentBytes: env.INGESTION_MAX_TEXT_CONTENT_BYTES,
    textPreviewLength: env.INGESTION_TEXT_PREVIEW_LENGTH,
    maxUploadSizeMb: env.MAX_UPLOAD_SIZE_MB,
  };
});
