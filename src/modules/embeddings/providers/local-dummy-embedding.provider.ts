import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import embeddingConfig from "../../../config/embedding.config.js";
import { localEmbeddingProviderName } from "../embeddings.constants.js";
import type {
  EmbedBatchInput,
  EmbedTextInput,
  EmbeddingBatchResult,
  EmbeddingResult,
} from "../embeddings.types.js";
import type { EmbeddingProvider } from "./embedding-provider.interface.js";

const unsignedIntMax = 0xffffffff;

/**
 * Deterministic local embedding provider for tests and development.
 */
@Injectable()
export class LocalDummyEmbeddingProvider implements EmbeddingProvider {
  constructor(
    @Inject(embeddingConfig.KEY)
    private readonly embedding: ConfigType<typeof embeddingConfig>
  ) {}

  /**
   * Embed a single text value deterministically.
   * @param input - Text to embed.
   * @returns Embedding result.
   */
  embedText(input: EmbedTextInput): Promise<EmbeddingResult> {
    const vector = createDeterministicVector(
      input.text,
      this.embedding.dimension
    );

    return Promise.resolve({
      vector,
      dimension: vector.length,
    });
  }

  /**
   * Embed text values deterministically.
   * @param input - Batch input.
   * @returns Batch embedding result.
   */
  async embedBatch(input: EmbedBatchInput): Promise<EmbeddingBatchResult> {
    const embeddings = await Promise.all(
      input.texts.map((text) => this.embedText({ text }))
    );

    return { embeddings };
  }

  /**
   * Get configured vector dimension.
   * @returns Embedding dimension.
   */
  getDimension(): number {
    return this.embedding.dimension;
  }

  /**
   * Get provider name.
   * @returns Provider name.
   */
  getProviderName(): string {
    return localEmbeddingProviderName;
  }

  /**
   * Get model name.
   * @returns Model name.
   */
  getModelName(): string {
    return this.embedding.model;
  }
}

/**
 * Create a deterministic pseudo-vector from text.
 * @param text - Source text.
 * @param dimension - Vector dimension.
 * @returns Deterministic vector.
 */
function createDeterministicVector(text: string, dimension: number): number[] {
  const vector: number[] = [];

  for (let index = 0; index < dimension; index += 1) {
    const hash = createHash("sha256")
      .update(`${text}:${index}`, "utf8")
      .digest();
    const value = hash.readUInt32BE(0) / unsignedIntMax;
    vector.push(value * 2 - 1);
  }

  return vector;
}
