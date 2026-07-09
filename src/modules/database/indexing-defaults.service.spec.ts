import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  DistanceMetric,
  EmbeddingProvider,
  QdrantCollectionStatus,
} from "../../generated/prisma/enums.js";
import { IndexingDefaultsService } from "./indexing-defaults.service.js";

const tenantId = "tenant_acme";

type UpsertMock = jest.Mock<(...args: any[]) => Promise<any>>;
type DelegateMock = {
  upsert: UpsertMock;
};
type PrismaMock = {
  $transaction: jest.MockedFunction<
    (work: (tx: PrismaMock) => Promise<unknown>) => Promise<unknown>
  >;
  chunkingConfig: DelegateMock;
  embeddingModel: DelegateMock;
  embeddingConfig: DelegateMock;
  qdrantCollection: DelegateMock;
};

/**
 * Create a typed async Jest mock.
 * @returns Typed async mock.
 */
function createUpsertMock(): UpsertMock {
  return jest.fn<(...args: any[]) => Promise<any>>();
}

/**
 * Create a Prisma mock for indexing default tests.
 * @returns Prisma mock.
 */
function createPrismaMock(): PrismaMock {
  const prisma = {
    $transaction:
      jest.fn<
        (work: (tx: PrismaMock) => Promise<unknown>) => Promise<unknown>
      >(),
    chunkingConfig: {
      upsert: createUpsertMock(),
    },
    embeddingModel: {
      upsert: createUpsertMock(),
    },
    embeddingConfig: {
      upsert: createUpsertMock(),
    },
    qdrantCollection: {
      upsert: createUpsertMock(),
    },
  };

  prisma.$transaction.mockImplementation(
    async (work: (tx: PrismaMock) => Promise<unknown>) => {
      return await work(prisma);
    }
  );
  prisma.chunkingConfig.upsert.mockResolvedValue({
    id: "chunking-config-id",
    tenantId,
    name: "Default Recursive Text Chunking",
    chunkSize: 512,
    chunkOverlap: 64,
  });
  prisma.embeddingModel.upsert.mockResolvedValue({
    id: "embedding-model-id",
    provider: EmbeddingProvider.OPENAI,
    modelName: "text-embedding-3-small",
    dimension: 1536,
  });
  prisma.embeddingConfig.upsert.mockResolvedValue({
    id: "embedding-config-id",
    tenantId,
    name: "Default Embedding Config",
    embeddingModelId: "embedding-model-id",
    chunkingConfigId: "chunking-config-id",
  });
  prisma.qdrantCollection.upsert.mockResolvedValue({
    id: "qdrant-collection-id",
    tenantId,
    name: "rag_kbs_development",
    status: QdrantCollectionStatus.ACTIVE,
  });

  return prisma;
}

/**
 * Create the indexing defaults service for tests.
 * @param prisma - Prisma mock.
 * @returns Indexing defaults service.
 */
function createService(prisma: PrismaMock): IndexingDefaultsService {
  return new IndexingDefaultsService(
    prisma as never,
    {
      defaultSize: 512,
      defaultOverlap: 64,
      textPreviewLength: 900,
      maxChunksPerDocument: 123,
    },
    {
      provider: "openai",
      model: "text-embedding-3-small",
      chatModel: "gpt-4o-mini",
      dimension: 1536,
      distanceMetric: "Cosine",
      batchSize: 64,
      timeoutMs: 30_000,
      maxRetries: 3,
      apiKey: "test-api-key",
    },
    {
      url: "http://qdrant:6333",
      apiKey: "",
      collection: "rag_kbs_development",
      vectorSize: 1536,
      distanceMetric: "Cosine",
      upsertBatchSize: 64,
      timeoutMs: 30_000,
    }
  );
}

describe("IndexingDefaultsService", () => {
  let prisma: PrismaMock;
  let service: IndexingDefaultsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = createService(prisma);
  });

  it("should create all default indexing records for a tenant", async () => {
    const records = await service.ensureTenantDefaults(tenantId);

    expect(records).toMatchObject({
      chunkingConfig: {
        tenantId,
        chunkSize: 512,
        chunkOverlap: 64,
      },
      embeddingModel: {
        provider: EmbeddingProvider.OPENAI,
        modelName: "text-embedding-3-small",
        dimension: 1536,
      },
      embeddingConfig: {
        tenantId,
        embeddingModelId: "embedding-model-id",
        chunkingConfigId: "chunking-config-id",
      },
      qdrantCollection: {
        tenantId,
        name: "rag_kbs_development",
        status: QdrantCollectionStatus.ACTIVE,
      },
    });
    expect(prisma.chunkingConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_name: {
            tenantId,
            name: "Default Recursive Text Chunking",
          },
        },
        create: expect.objectContaining({
          tenantId,
          chunkSize: 512,
          chunkOverlap: 64,
        }),
      })
    );
    expect(prisma.embeddingConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          tenantId,
          embeddingModelId: "embedding-model-id",
          chunkingConfigId: "chunking-config-id",
        }),
      })
    );
    expect(prisma.qdrantCollection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          tenantId,
          vectorSize: 1536,
          distanceMetric: DistanceMetric.COSINE,
          isDefaultRead: true,
          isDefaultWrite: true,
        }),
      })
    );
  });

  it("should use idempotent upserts on repeated calls", async () => {
    await service.ensureTenantDefaults(tenantId);
    await service.ensureTenantDefaults(tenantId);

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.chunkingConfig.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.embeddingModel.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.embeddingConfig.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.qdrantCollection.upsert).toHaveBeenCalledTimes(2);
  });

  it("should repair inactive or deleted default records", async () => {
    await service.ensureTenantDefaults(tenantId);

    expect(prisma.chunkingConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          isDefault: true,
          isActive: true,
          deletedAt: null,
        }),
      })
    );
    expect(prisma.embeddingConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          isDefault: true,
          isActive: true,
        }),
      })
    );
    expect(prisma.qdrantCollection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: QdrantCollectionStatus.ACTIVE,
          isDefaultRead: true,
          isDefaultWrite: true,
          deletedAt: null,
        }),
      })
    );
  });

  it("should keep tenant-scoped defaults isolated", async () => {
    await service.ensureTenantDefaults("tenant-a");
    await service.ensureTenantDefaults("tenant-b");

    expect(prisma.chunkingConfig.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId_name: expect.objectContaining({ tenantId: "tenant-a" }),
        }),
      })
    );
    expect(prisma.chunkingConfig.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId_name: expect.objectContaining({ tenantId: "tenant-b" }),
        }),
      })
    );
    expect(prisma.qdrantCollection.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId_name: expect.objectContaining({ tenantId: "tenant-a" }),
        }),
      })
    );
    expect(prisma.qdrantCollection.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId_name: expect.objectContaining({ tenantId: "tenant-b" }),
        }),
      })
    );
  });
});
