import { describe, expect, it } from "@jest/globals";
import { ChunkingService } from "./services/chunking.service.js";
import { TokenEstimatorService } from "./services/token-estimator.service.js";
import { RecursiveTextChunkingStrategy } from "./strategies/recursive-text-chunking.strategy.js";

const chunkingConfig = {
  id: "chunking-config-id",
  tenantId: "tenant_acme",
  name: "Default Recursive Text Chunking",
  strategy: "RECURSIVE_TEXT",
  chunkSize: 12,
  chunkOverlap: 3,
  tokenizer: "APPROXIMATE",
  preserveHeadings: true,
  preserveParagraphs: true,
};

/**
 * Create the chunking service for tests.
 * @returns Chunking service.
 */
function createChunkingService(): ChunkingService {
  const tokenEstimator = new TokenEstimatorService();
  const strategy = new RecursiveTextChunkingStrategy(tokenEstimator);

  return new ChunkingService(strategy, {
    defaultSize: 800,
    defaultOverlap: 120,
    textPreviewLength: 40,
    maxChunksPerDocument: 100,
  });
}

describe("ChunkingService", () => {
  it("should chunk plain text with stable hashes and previews", async () => {
    const service = createChunkingService();
    const chunks = await service.chunkText({
      parsedDocumentId: "parsed-1",
      text: "Alpha paragraph with enough content.\n\nBeta paragraph with enough content.",
      config: chunkingConfig,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(chunks[0].textPreview.length).toBeLessThanOrEqual(40);

    const secondRun = await service.chunkText({
      parsedDocumentId: "parsed-1",
      text: "Alpha paragraph with enough content.\n\nBeta paragraph with enough content.",
      config: chunkingConfig,
    });

    expect(secondRun.map((chunk) => chunk.contentHash)).toEqual(
      chunks.map((chunk) => chunk.contentHash)
    );
  });

  it("should preserve Markdown heading paths where possible", async () => {
    const service = createChunkingService();
    const chunks = await service.chunkText({
      parsedDocumentId: "parsed-1",
      text: "# Guide\n\nIntro text.\n\n## Install\n\nRun pnpm install and start the worker.",
      config: chunkingConfig,
    });

    expect(chunks.some((chunk) => chunk.headingPath.includes("Guide"))).toBe(
      true
    );
    expect(chunks.some((chunk) => chunk.text.includes("Install"))).toBe(true);
  });

  it("should enforce the maximum chunk count", async () => {
    const tokenEstimator = new TokenEstimatorService();
    const strategy = new RecursiveTextChunkingStrategy(tokenEstimator);

    await expect(
      strategy.chunkText({
        parsedDocumentId: "parsed-1",
        text: "one two three four five six seven eight nine ten",
        config: {
          ...chunkingConfig,
          chunkSize: 1,
          chunkOverlap: 0,
        },
        textPreviewLength: 20,
        maxChunksPerDocument: 2,
      })
    ).rejects.toThrow("CHUNKING_MAX_CHUNKS_EXCEEDED");
  });
});
