import { describe, expect, it, jest } from "@jest/globals";
import { ChunksService } from "./chunks.service.js";

const tenantId = "tenant_acme";
const chunkId = "113d5fe3-927e-428d-9b55-557a6f776ed9";

type MockFn = ReturnType<typeof jest.fn>;

/**
 * Create a Prisma mock for chunk service tests.
 * @returns Prisma mock.
 */
function createPrismaMock() {
  return {
    documentChunk: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    chunkEmbedding: {
      findFirst: jest.fn(),
    },
  };
}

describe("ChunksService", () => {
  it("should return chunk previews without full text", async () => {
    const prisma = createPrismaMock();
    const service = new ChunksService(prisma as never);
    (prisma.documentChunk.findFirst as MockFn).mockResolvedValue({
      id: chunkId,
      tenantId,
      chunkIndex: 0,
      text: "full secret chunk text",
      textPreview: "preview",
      contentHash:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      status: "EMBEDDED",
      embeddings: [
        {
          id: "embedding-1",
          qdrantPointId: "point-1",
          vector: [1, 2, 3],
        },
      ],
    });

    const result = await service.getById(chunkId, tenantId);

    expect(result.textPreview).toBe("preview");
    expect(result).not.toHaveProperty("text");
    expect(JSON.stringify(result)).not.toContain("full secret chunk text");
    expect(JSON.stringify(result)).not.toContain("[1,2,3]");
  });

  it("should return embedding metadata without vectors", async () => {
    const prisma = createPrismaMock();
    const service = new ChunksService(prisma as never);
    (prisma.chunkEmbedding.findFirst as MockFn).mockResolvedValue({
      id: "embedding-1",
      tenantId,
      chunkId,
      qdrantPointId: "point-1",
      vectorDimension: 1536,
      vector: [1, 2, 3],
      status: "INDEXED",
    });

    const result = await service.getEmbedding(chunkId, tenantId);

    expect(result.qdrantPointId).toBe("point-1");
    expect(result.vectorDimension).toBe(1536);
    expect(result).not.toHaveProperty("vector");
  });
});
