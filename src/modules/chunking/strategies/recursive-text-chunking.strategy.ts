import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { markdownHeadingPattern } from "../chunking.constants.js";
import type { ChunkTextInput, ChunkTextResult } from "../chunking.types.js";
import type { ChunkingStrategy } from "./chunking-strategy.interface.js";
import { TokenEstimatorService } from "../services/token-estimator.service.js";

/**
 * Chunks normalized text with LangChain recursive splitting.
 */
@Injectable()
export class RecursiveTextChunkingStrategy implements ChunkingStrategy {
  constructor(private readonly tokenEstimator: TokenEstimatorService) {}

  /**
   * Split text into stable, metadata-rich chunks.
   * @param input - Chunking input.
   * @returns Generated chunks.
   */
  async chunkText(input: ChunkTextInput): Promise<ChunkTextResult[]> {
    const normalizedText = normalizeText(input.text);

    if (normalizedText.length === 0) {
      return [];
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: input.config.chunkSize,
      chunkOverlap: input.config.chunkOverlap,
      keepSeparator: true,
      lengthFunction: (text: string) => this.tokenEstimator.estimate(text),
      separators: buildSeparators(input.config),
    });
    const splitChunks = await splitter.splitText(normalizedText);
    const chunks = buildChunkResults(input, normalizedText, splitChunks);

    if (chunks.length > input.maxChunksPerDocument) {
      throw new Error("CHUNKING_MAX_CHUNKS_EXCEEDED");
    }

    return chunks;
  }
}

/**
 * Normalize parser output before chunking.
 * @param text - Parsed document text.
 * @returns Normalized text.
 */
function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

/**
 * Build recursive split separators from config.
 * @param config - Chunking config.
 * @returns Ordered separators.
 */
function buildSeparators(config: ChunkTextInput["config"]): string[] {
  const separators: string[] = [];

  if (config.preserveHeadings) {
    separators.push(
      "\n# ",
      "\n## ",
      "\n### ",
      "\n#### ",
      "\n##### ",
      "\n###### "
    );
  }

  if (config.preserveParagraphs !== false) {
    separators.push("\n\n");
  }

  separators.push("\n", ". ", " ", "");

  return separators;
}

/**
 * Build result records from split chunks.
 * @param input - Chunking input.
 * @param normalizedText - Normalized source text.
 * @param splitChunks - Raw split chunks.
 * @returns Chunking result records.
 */
function buildChunkResults(
  input: ChunkTextInput,
  normalizedText: string,
  splitChunks: string[]
): ChunkTextResult[] {
  const chunks: ChunkTextResult[] = [];
  let searchStart = 0;

  for (const splitChunk of splitChunks) {
    const text = normalizeText(splitChunk);

    if (text.length === 0) {
      continue;
    }

    const charStart = findChunkStart(normalizedText, text, searchStart);
    const charEnd = charStart + text.length;
    const headingPath = getHeadingPath(normalizedText, charStart);

    chunks.push({
      chunkIndex: chunks.length,
      text,
      textPreview: text.slice(0, input.textPreviewLength),
      tokenCount: estimateChunkTokens(text),
      charStart,
      charEnd,
      headingPath,
      contentHash: createContentHash(text),
    });

    searchStart = Math.max(charStart + 1, charEnd - input.config.chunkOverlap);
  }

  return chunks;
}

/**
 * Find a chunk start offset with a deterministic fallback.
 * @param sourceText - Full source text.
 * @param chunkText - Chunk text.
 * @param searchStart - Preferred search offset.
 * @returns Character start offset.
 */
function findChunkStart(
  sourceText: string,
  chunkText: string,
  searchStart: number
): number {
  const directIndex = sourceText.indexOf(chunkText, searchStart);

  if (directIndex >= 0) {
    return directIndex;
  }

  const fallbackIndex = sourceText.indexOf(chunkText);

  return fallbackIndex >= 0 ? fallbackIndex : searchStart;
}

/**
 * Estimate tokens for a chunk.
 * @param input - Chunking input.
 * @param text - Chunk text.
 * @returns Estimated token count.
 */
function estimateChunkTokens(text: string): number {
  const averageCharsPerToken = 4;

  return Math.max(1, Math.ceil(text.length / averageCharsPerToken));
}

/**
 * Create a deterministic content hash for chunk text.
 * @param text - Normalized chunk text.
 * @returns SHA-256 hash.
 */
function createContentHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Get the active Markdown heading path at a source offset.
 * @param sourceText - Full source text.
 * @param charStart - Chunk start offset.
 * @returns Heading path.
 */
function getHeadingPath(sourceText: string, charStart: number): string[] {
  const headingPath: string[] = [];
  const headingText = sourceText.slice(0, charStart);
  const matcher = new RegExp(markdownHeadingPattern.source, "gm");
  let match = matcher.exec(headingText);

  while (match) {
    const level = match[1].length;
    const title = match[2].trim();
    headingPath.splice(level - 1);
    headingPath[level - 1] = title;
    match = matcher.exec(headingText);
  }

  return headingPath.filter(Boolean);
}
