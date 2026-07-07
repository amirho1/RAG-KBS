import { registerAs } from "@nestjs/config";
import { getValidatedEnv } from "./validated-env.js";

/**
 * Qdrant vector database configuration namespace.
 */
export default registerAs("qdrant", () => {
  const env = getValidatedEnv();

  return {
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY,
    collection: env.QDRANT_COLLECTION_NAME || env.QDRANT_COLLECTION,
    vectorSize: env.QDRANT_VECTOR_SIZE ?? env.EMBEDDING_DIMENSION,
    distanceMetric: env.QDRANT_DISTANCE_METRIC,
    upsertBatchSize: env.QDRANT_UPSERT_BATCH_SIZE,
    timeoutMs: env.QDRANT_TIMEOUT_MS,
  };
});
