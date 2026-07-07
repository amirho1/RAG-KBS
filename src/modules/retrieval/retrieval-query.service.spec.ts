import { describe, expect, it, jest } from "@jest/globals";
import { RetrievalQueryService } from "./services/retrieval-query.service.js";

const tenantId = "tenant_acme";
const knowledgeBaseId = "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4";
const sourceId = "adf1ed11-f72e-4af4-9a1b-9d6d9941d30e";

/**
 * Create a retrieval query service with mocked Prisma methods.
 * @param overrides - Mock overrides.
 * @returns Service and mocked Prisma object.
 */
function createService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    knowledgeBase: {
      findFirst: jest.fn(() => Promise.resolve({ id: knowledgeBaseId })),
    },
    source: {
      count: jest.fn(() => Promise.resolve(0)),
    },
    documentFile: {
      count: jest.fn(() => Promise.resolve(0)),
    },
    tag: {
      findMany: jest.fn(() => Promise.resolve([])),
    },
    retrievalQuery: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    ...overrides,
  };

  return {
    service: new RetrievalQueryService(prisma as never),
    prisma,
  };
}

describe("RetrievalQueryService", () => {
  it("should prevent cross-tenant retrieval when knowledge base is missing", async () => {
    const { service } = createService({
      knowledgeBase: {
        findFirst: jest.fn(() => Promise.resolve(null)),
      },
    });

    await expect(
      service.validateScope(tenantId, knowledgeBaseId, {
        sourceIds: [],
        fileIds: [],
        tags: [],
        mimeTypes: [],
      })
    ).rejects.toMatchObject({
      errorCode: "KNOWLEDGE_BASE_NOT_FOUND",
    });
  });

  it("should reject source IDs outside the tenant knowledge base", async () => {
    const { service } = createService({
      source: {
        count: jest.fn(() => Promise.resolve(0)),
      },
    });

    await expect(
      service.validateScope(tenantId, knowledgeBaseId, {
        sourceIds: [sourceId],
        fileIds: [],
        tags: [],
        mimeTypes: [],
      })
    ).rejects.toMatchObject({
      errorCode: "INVALID_RETRIEVAL_FILTER",
    });
  });

  it("should return normalized and display tag values", async () => {
    const { service } = createService({
      tag: {
        findMany: jest.fn(() =>
          Promise.resolve([{ name: "API Docs", normalizedName: "api docs" }])
        ),
      },
    });

    const result = await service.validateScope(tenantId, knowledgeBaseId, {
      sourceIds: [],
      fileIds: [],
      tags: ["api docs"],
      mimeTypes: [],
    });

    expect(result.tagFilterValues).toEqual(["API Docs", "api docs"]);
  });
});
