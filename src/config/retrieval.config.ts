import { registerAs } from "@nestjs/config";
import { getValidatedEnv } from "./validated-env.js";

/**
 * Retrieval API configuration namespace.
 */
export default registerAs("retrieval", () => {
  const env = getValidatedEnv();

  return {
    defaultTopK: env.RETRIEVAL_DEFAULT_TOP_K,
    maxTopK: env.RETRIEVAL_MAX_TOP_K,
    defaultScoreThreshold: env.RETRIEVAL_DEFAULT_SCORE_THRESHOLD,
    timeoutMs: env.RETRIEVAL_TIMEOUT_MS,
    storeQueryText: env.RETRIEVAL_STORE_QUERY_TEXT,
    storeResults: env.RETRIEVAL_STORE_RESULTS,
    includeTextDefault: env.RETRIEVAL_INCLUDE_TEXT_DEFAULT,
    includeMetadataDefault: env.RETRIEVAL_INCLUDE_METADATA_DEFAULT,
  };
});
