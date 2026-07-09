import { registerAs } from "@nestjs/config";
import { getValidatedEnv } from "./validated-env.js";

/**
 * Embedding provider configuration namespace.
 */
export default registerAs("embedding", () => {
  const env = getValidatedEnv();

  return {
    provider: env.EMBEDDING_PROVIDER,
    model: env.EMBEDDING_MODEL,
    chatModel: env.OPENAI_CHAT_MODEL,
    dimension: env.EMBEDDING_DIMENSION,
    distanceMetric: env.EMBEDDING_DISTANCE_METRIC,
    batchSize: env.EMBEDDING_BATCH_SIZE,
    timeoutMs: env.EMBEDDING_TIMEOUT_MS,
    maxRetries: env.EMBEDDING_MAX_RETRIES,
    apiKey: env.OPENAI_API_KEY || env.EMBEDDING_API_KEY,
    baseUrl: env.OPENAI_BASE_URL,
  };
});
