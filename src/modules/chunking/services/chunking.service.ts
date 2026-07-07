import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import chunkingConfig from "../../../config/chunking.config.js";
import type { ChunkTextInput, ChunkTextResult } from "../chunking.types.js";
import { RecursiveTextChunkingStrategy } from "../strategies/recursive-text-chunking.strategy.js";

/**
 * Coordinates text chunking strategies.
 */
@Injectable()
export class ChunkingService {
  constructor(
    private readonly recursiveTextStrategy: RecursiveTextChunkingStrategy,
    @Inject(chunkingConfig.KEY)
    private readonly chunking: ConfigType<typeof chunkingConfig>
  ) {}

  /**
   * Chunk normalized parsed document text.
   * @param input - Chunking input.
   * @returns Generated chunks.
   */
  chunkText(
    input: Omit<ChunkTextInput, "textPreviewLength" | "maxChunksPerDocument">
  ): Promise<ChunkTextResult[]> {
    return this.recursiveTextStrategy.chunkText({
      ...input,
      textPreviewLength: this.chunking.textPreviewLength,
      maxChunksPerDocument: this.chunking.maxChunksPerDocument,
    });
  }
}
