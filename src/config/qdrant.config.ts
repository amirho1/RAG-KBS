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
    collection: env.QDRANT_COLLECTION,
  };
});
