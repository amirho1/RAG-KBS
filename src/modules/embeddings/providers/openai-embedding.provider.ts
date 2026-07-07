import { Injectable } from "@nestjs/common";
import { openAiEmbeddingProviderName } from "../embeddings.constants.js";
import type {
  EmbedBatchInput,
  EmbedTextInput,
  EmbeddingBatchResult,
  EmbeddingResult,
} from "../embeddings.types.js";
import type { EmbeddingProvider } from "./embedding-provider.interface.js";
import { LangChainOpenAiService } from "../services/langchain-open-ai.service.js";

/**
 * OpenAI embedding provider backed by LangChain.
 */
@Injectable()
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly langChainOpenAiService: LangChainOpenAiService
  ) {}

  /**
   * Embed a single text value.
   * @param input - Text to embed.
   * @returns Embedding result.
   */
  async embedText(input: EmbedTextInput): Promise<EmbeddingResult> {
    const embeddings = this.langChainOpenAiService.createEmbeddings();
    const vector = await embeddings.embedQuery(input.text);

    return {
      vector,
      dimension: vector.length,
    };
  }

  /**
   * Embed text values in one provider batch.
   * @param input - Batch input.
   * @returns Batch embedding result.
   */
  async embedBatch(input: EmbedBatchInput): Promise<EmbeddingBatchResult> {
    const embeddings = this.langChainOpenAiService.createEmbeddings();
    const vectors = await embeddings.embedDocuments(input.texts);

    return {
      embeddings: vectors.map((vector) => ({
        vector,
        dimension: vector.length,
      })),
    };
  }

  /**
   * Get the configured embedding dimension.
   * @returns Embedding dimension.
   */
  getDimension(): number {
    return this.langChainOpenAiService.createEmbeddings().dimensions ?? 0;
  }

  /**
   * Get provider name.
   * @returns Provider name.
   */
  getProviderName(): string {
    return openAiEmbeddingProviderName;
  }

  /**
   * Get model name.
   * @returns Model name.
   */
  getModelName(): string {
    return this.langChainOpenAiService.createEmbeddings().model;
  }
}
