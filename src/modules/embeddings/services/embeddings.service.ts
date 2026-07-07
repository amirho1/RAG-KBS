import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import embeddingConfig from "../../../config/embedding.config.js";
import { EmbeddingProvider as PrismaEmbeddingProvider } from "../../../generated/prisma/enums.js";
import {
  localEmbeddingProviderName,
  openAiEmbeddingProviderName,
} from "../embeddings.constants.js";
import type { EmbeddingBatchResult } from "../embeddings.types.js";
import type { EmbeddingProvider } from "../providers/embedding-provider.interface.js";
import { LocalDummyEmbeddingProvider } from "../providers/local-dummy-embedding.provider.js";
import { OpenAIEmbeddingProvider } from "../providers/openai-embedding.provider.js";

/**
 * Selects embedding providers and validates embedding outputs.
 */
@Injectable()
export class EmbeddingsService {
  constructor(
    private readonly openAiProvider: OpenAIEmbeddingProvider,
    private readonly localDummyProvider: LocalDummyEmbeddingProvider,
    @Inject(embeddingConfig.KEY)
    private readonly embedding: ConfigType<typeof embeddingConfig>
  ) {}

  /**
   * Embed texts with the configured provider.
   * @param texts - Texts to embed.
   * @param expectedDimension - Expected vector dimension.
   * @param provider - Provider from database model.
   * @returns Batch embedding result.
   */
  async embedBatch(
    texts: string[],
    expectedDimension: number,
    provider: PrismaEmbeddingProvider
  ): Promise<EmbeddingBatchResult> {
    const embeddingProvider = this.getProvider(provider);
    const result = await embeddingProvider.embedBatch({ texts });

    validateEmbeddingDimensions(result, expectedDimension);

    return result;
  }

  /**
   * Get configured provider batch size.
   * @returns Embedding batch size.
   */
  getBatchSize(): number {
    return this.embedding.batchSize;
  }

  /**
   * Select an embedding provider.
   * @param provider - Database provider enum.
   * @returns Embedding provider implementation.
   */
  private getProvider(provider: PrismaEmbeddingProvider): EmbeddingProvider {
    if (
      provider === PrismaEmbeddingProvider.LOCAL ||
      this.embedding.provider === localEmbeddingProviderName
    ) {
      return this.localDummyProvider;
    }

    if (
      provider === PrismaEmbeddingProvider.OPENAI ||
      this.embedding.provider === openAiEmbeddingProviderName
    ) {
      return this.openAiProvider;
    }

    throw new Error("EMBEDDING_PROVIDER_NOT_SUPPORTED");
  }
}

/**
 * Validate every embedding vector dimension.
 * @param result - Batch embedding result.
 * @param expectedDimension - Expected vector dimension.
 */
function validateEmbeddingDimensions(
  result: EmbeddingBatchResult,
  expectedDimension: number
): void {
  for (const embedding of result.embeddings) {
    if (embedding.dimension !== expectedDimension) {
      throw new Error("EMBEDDING_DIMENSION_MISMATCH");
    }
  }
}
