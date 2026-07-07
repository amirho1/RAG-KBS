import { registerAs } from "@nestjs/config";
import { getValidatedEnv } from "./validated-env.js";

/**
 * Text chunking configuration namespace.
 */
export default registerAs("chunking", () => {
  const env = getValidatedEnv();

  return {
    defaultSize: env.CHUNKING_DEFAULT_SIZE,
    defaultOverlap: env.CHUNKING_DEFAULT_OVERLAP,
    textPreviewLength: env.CHUNKING_TEXT_PREVIEW_LENGTH,
    maxChunksPerDocument: env.CHUNKING_MAX_CHUNKS_PER_DOCUMENT,
  };
});
