import { describe, expect, it, jest } from "@jest/globals";
import { EmbeddingProvider } from "../../generated/prisma/enums.js";
import { RetrievalFilterService } from "./services/retrieval-filter.service.js";
import { RetrievalResponseMapperService } from "./services/retrieval-response-mapper.service.js";
import { RetrievalService } from "./services/retrieval.service.js";

const tenantId = "tenant_acme";
const knowledgeBaseId = "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4";
const sourceId = "adf1ed11-f72e-4af4-9a1b-9d6d9941d30e";
const fileId = "113d5fe3-927e-428d-9b55-557a6f776ed9";
const chunkId = "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b";
const chunkEmbeddingId = "4e946c9e-ea1e-48d4-aa8e-7f3e4a29c41d";
const queryId = "6db3b2e6-b677-40a6-9a29-383793cf2f25";
const embeddingConfigId = "68a817e8-440e-4c60-93b0-9bb997f93847";
const embeddingModelId = "3d0210a2-5be1-4bfb-8cc9-d5a616e7e857";
const qdrantCollectionId = "9cf2e930-6d58-483f-a975-8f9477770b70";

/**
 * Create a retrieval service test harness.
 * @param overrides - Dependency overrides.
 * @returns Service and mocked dependencies.
 */
function createHarness(overrides: Record<string, unknown> = {}) {
  const retrievalQueryService = {
    validateScope: jest.fn<(...args: any[]) => Promise<unknown>>(() =>
      Promise.resolve({ tagFilterValues: ["api-docs"] })
    ),
    createQueryHash: jest.fn<(...args: any[]) => string>(() => "query-hash"),
    createPendingQuery: jest.fn<(...args: any[]) => Promise<unknown>>(() =>
      Promise.resolve({
        id: queryId,
        createdAt: new Date("2026-07-04T00:00:00.000Z"),
      })
    ),
    attachExecutionTargets: jest.fn<(...args: any[]) => Promise<void>>(() =>
      Promise.resolve()
    ),
    markCompleted: jest.fn<(...args: any[]) => Promise<void>>(() =>
      Promise.resolve()
    ),
    markFailed: jest.fn<(...args: any[]) => Promise<void>>(() =>
      Promise.resolve()
    ),
    getById: jest.fn<(...args: any[]) => Promise<unknown>>(),
  };
  const retrievalResultService = {
    storeResults: jest.fn<(...args: any[]) => Promise<void>>(() =>
      Promise.resolve()
    ),
  };
  const embeddingConfigService = {
    getDefaultConfig: jest.fn<(...args: any[]) => Promise<unknown>>(() =>
      Promise.resolve(createEmbeddingConfig(4))
    ),
  };
  const embeddingsService = {
    embedBatch: jest.fn<(...args: any[]) => Promise<unknown>>(() =>
      Promise.resolve({
        embeddings: [{ vector: [0.1, 0.2, 0.3, 0.4], dimension: 4 }],
      })
    ),
  };
  const qdrantCollectionService = {
    getDefaultReadCollection: jest.fn<(...args: any[]) => Promise<unknown>>(
      () => Promise.resolve(createCollection(4))
    ),
  };
  const qdrantService = {
    searchPoints: jest.fn<(...args: any[]) => Promise<unknown>>(() =>
      Promise.resolve([
        {
          id: "point-1",
          score: 0.82,
          payload: createPayload(),
        },
      ])
    ),
  };
  const logger = {
    info: jest.fn<(...args: any[]) => void>(),
    errorPayload: jest.fn<(...args: any[]) => void>(),
  };
  const requestContextService = {
    getRequestId: jest.fn<(...args: any[]) => string>(() => "req_test"),
  };
  const retrievalConfig = {
    defaultTopK: 8,
    maxTopK: 30,
    defaultScoreThreshold: 0,
    timeoutMs: 30_000,
    storeQueryText: true,
    storeResults: true,
    includeTextDefault: true,
    includeMetadataDefault: true,
  };
  const deps = {
    retrievalQueryService,
    retrievalResultService,
    embeddingConfigService,
    embeddingsService,
    qdrantCollectionService,
    qdrantService,
    logger,
    requestContextService,
    retrievalConfig,
    ...overrides,
  };

  return {
    service: new RetrievalService(
      deps.retrievalQueryService as never,
      deps.retrievalResultService as never,
      new RetrievalFilterService(),
      new RetrievalResponseMapperService(),
      deps.embeddingConfigService as never,
      deps.embeddingsService as never,
      deps.qdrantCollectionService as never,
      deps.qdrantService as never,
      deps.logger as never,
      deps.requestContextService as never,
      deps.retrievalConfig
    ),
    deps,
  };
}

describe("RetrievalService", () => {
  it("should embed the query, search Qdrant, store results, and return chunks", async () => {
    const { service, deps } = createHarness();

    const response = await service.query({
      tenantId,
      knowledgeBaseId,
      query: "  How do I upload documents?  ",
      filters: {
        sourceIds: [sourceId],
        tags: ["API Docs"],
      },
    });

    expect(deps.embeddingsService.embedBatch).toHaveBeenCalledWith(
      ["How do I upload documents?"],
      4,
      EmbeddingProvider.OPENAI
    );
    expect(deps.qdrantService.searchPoints).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionName: "rag_kbs_test",
        topK: 8,
        scoreThreshold: 0,
      })
    );
    expect(deps.retrievalResultService.storeResults).toHaveBeenCalledWith(
      queryId,
      tenantId,
      expect.any(Array),
      true
    );
    expect(response).toMatchObject({
      queryId,
      tenantId,
      knowledgeBaseId,
      query: "How do I upload documents?",
      topK: 8,
      resultCount: 1,
      results: [
        {
          rank: 1,
          score: 0.82,
          chunkId,
          sourceId,
          fileId,
        },
      ],
    });
    expect(response.results[0]).not.toHaveProperty("persistedPayload");
  });

  it("should reject topK values above the configured maximum", async () => {
    const { service } = createHarness();

    await expect(
      service.query({
        tenantId,
        knowledgeBaseId,
        query: "How do I upload documents?",
        topK: 31,
      })
    ).rejects.toMatchObject({
      errorCode: "INVALID_RETRIEVAL_FILTER",
    });
  });

  it("should reject embedding dimension mismatches", async () => {
    const { service, deps } = createHarness({
      qdrantCollectionService: {
        getDefaultReadCollection: jest.fn<(...args: any[]) => Promise<unknown>>(
          () => Promise.resolve(createCollection(8))
        ),
      },
    });

    await expect(
      service.query({
        tenantId,
        knowledgeBaseId,
        query: "How do I upload documents?",
      })
    ).rejects.toMatchObject({
      errorCode: "EMBEDDING_DIMENSION_MISMATCH",
    });
    expect(deps.retrievalQueryService.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "EMBEDDING_DIMENSION_MISMATCH",
      })
    );
  });

  it("should return empty results safely", async () => {
    const { service, deps } = createHarness({
      qdrantService: {
        searchPoints: jest.fn<(...args: any[]) => Promise<unknown>>(() =>
          Promise.resolve([])
        ),
      },
    });

    const response = await service.query({
      tenantId,
      knowledgeBaseId,
      query: "How do I upload documents?",
    });

    expect(response.resultCount).toBe(0);
    expect(response.results).toEqual([]);
    expect(deps.retrievalResultService.storeResults).toHaveBeenCalledWith(
      queryId,
      tenantId,
      [],
      true
    );
  });

  it("should return a safe error when Qdrant search fails", async () => {
    const { service, deps } = createHarness({
      qdrantService: {
        searchPoints: jest.fn<(...args: any[]) => Promise<unknown>>(() =>
          Promise.reject(new Error("QDRANT_URL=secret"))
        ),
      },
    });

    await expect(
      service.query({
        tenantId,
        knowledgeBaseId,
        query: "How do I upload documents?",
      })
    ).rejects.toMatchObject({
      errorCode: "QDRANT_SEARCH_FAILED",
    });
    expect(deps.retrievalQueryService.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "QDRANT_SEARCH_FAILED",
      })
    );
  });

  it("should return a safe timeout error", async () => {
    const { service, deps } = createHarness({
      embeddingsService: {
        embedBatch: jest.fn<(...args: any[]) => Promise<unknown>>(
          () =>
            new Promise(() => {
              return undefined;
            })
        ),
      },
      retrievalConfig: {
        defaultTopK: 8,
        maxTopK: 30,
        defaultScoreThreshold: 0,
        timeoutMs: 1,
        storeQueryText: true,
        storeResults: true,
        includeTextDefault: true,
        includeMetadataDefault: true,
      },
    });

    await expect(
      service.query({
        tenantId,
        knowledgeBaseId,
        query: "How do I upload documents?",
      })
    ).rejects.toMatchObject({
      errorCode: "RETRIEVAL_TIMEOUT",
    });
    expect(deps.retrievalQueryService.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "RETRIEVAL_TIMEOUT",
      })
    );
  });
});

/**
 * Create an embedding config fixture.
 * @param dimension - Embedding dimension.
 * @returns Embedding config fixture.
 */
function createEmbeddingConfig(dimension: number) {
  return {
    id: embeddingConfigId,
    embeddingModelId,
    embeddingModel: {
      id: embeddingModelId,
      provider: EmbeddingProvider.OPENAI,
      dimension,
      isActive: true,
    },
  };
}

/**
 * Create a Qdrant collection fixture.
 * @param vectorSize - Vector size.
 * @returns Qdrant collection fixture.
 */
function createCollection(vectorSize: number) {
  return {
    id: qdrantCollectionId,
    name: "rag_kbs_test",
    embeddingModelId,
    embeddingConfigId,
    vectorSize,
  };
}

/**
 * Create a Qdrant payload fixture.
 * @returns Qdrant payload fixture.
 */
function createPayload() {
  return {
    tenantId,
    knowledgeBaseId,
    sourceId,
    fileId,
    chunkId,
    chunkEmbeddingId,
    qdrantCollectionId,
    text: "To upload a document, send a multipart request.",
    textPreview: "To upload a document...",
    tags: ["api-docs"],
    mimeType: "text/markdown",
    chunkIndex: 1,
  };
}
