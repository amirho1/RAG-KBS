import type {
  EmbedBatchInput,
  EmbedTextInput,
  EmbeddingBatchResult,
  EmbeddingResult,
} from "../embeddings.types.js";

export interface EmbeddingProvider {
  embedText(input: EmbedTextInput): Promise<EmbeddingResult>;
  embedBatch(input: EmbedBatchInput): Promise<EmbeddingBatchResult>;
  getDimension(): number;
  getProviderName(): string;
  getModelName(): string;
}
