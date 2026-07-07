import type { ChunkTextInput, ChunkTextResult } from "../chunking.types.js";

export interface ChunkingStrategy {
  chunkText(input: ChunkTextInput): Promise<ChunkTextResult[]>;
}
