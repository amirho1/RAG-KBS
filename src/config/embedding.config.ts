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
    dimension: env.EMBEDDING_DIMENSION,
    apiKey: env.EMBEDDING_API_KEY,
  };
});
