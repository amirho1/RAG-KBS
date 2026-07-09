import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { IngestionError } from "../ingestion.types.js";
import { IndexingPipelineService } from "./indexing-pipeline.service.js";

const tenantId = "tenant_acme";
const parsedDocumentId = "7c2ce46b-9f4a-4377-b6b6-2257afebfca2";
const ingestionJobId = "4e946c9e-ea1e-48d4-aa8e-7f3e4a29c41d";
const knowledgeBaseId = "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4";
const sourceId = "adf1ed11-f72e-4af4-9a1b-9d6d9941d30e";
const fileId = "113d5fe3-927e-428d-9b55-557a6f776ed9";

type ServiceHarness = {
  service: IndexingPipelineService;
  prisma: {
    parsedDocument: {
      findFirst: jest.MockedFunction<() => Promise<Record<string, unknown>>>;
    };
  };
  indexingDefaultsService: {
    ensureTenantDefaults: jest.MockedFunction<
      (tenantId: string) => Promise<void>
    >;
  };
  chunkingConfigService: {
    getDefaultConfig: jest.MockedFunction<
      (tenantId: string) => Promise<unknown>
    >;
  };
};

/**
 * Create a parsed document fixture for indexing tests.
 * @returns Parsed document fixture.
 */
function createParsedDocumentFixture(): Record<string, unknown> {
  return {
    id: parsedDocumentId,
    tenantId,
    organizationId: null,
    projectId: null,
    knowledgeBaseId,
    sourceId,
    fileId,
    extractedText: "hello world",
    textPreview: "hello world",
    source: {
      tags: [],
    },
    file: {
      tags: [],
    },
  };
}

/**
 * Create an indexing pipeline service test harness.
 * @returns Service harness.
 */
function createServiceHarness(): ServiceHarness {
  const prisma = {
    parsedDocument: {
      findFirst: jest.fn<() => Promise<Record<string, unknown>>>(),
    },
  };
  const indexingDefaultsService = {
    ensureTenantDefaults: jest.fn<(tenantId: string) => Promise<void>>(),
  };
  const chunkingConfigService = {
    getDefaultConfig: jest.fn<(tenantId: string) => Promise<unknown>>(),
  };
  const service = new IndexingPipelineService(
    prisma as never,
    indexingDefaultsService as never,
    chunkingConfigService as never,
    {
      chunkText: jest.fn(),
    } as never,
    {
      getDefaultConfig: jest.fn(),
    } as never,
    {
      getBatchSize: jest.fn(),
    } as never,
    {
      getDefaultWriteCollection: jest.fn(),
    } as never,
    {} as never,
    {} as never,
    {
      info: jest.fn(),
      errorPayload: jest.fn(),
    } as never
  );

  return {
    service,
    prisma,
    indexingDefaultsService,
    chunkingConfigService,
  };
}

describe("IndexingPipelineService", () => {
  let harness: ServiceHarness;

  beforeEach(() => {
    harness = createServiceHarness();
    harness.indexingDefaultsService.ensureTenantDefaults.mockResolvedValue();
    harness.prisma.parsedDocument.findFirst.mockResolvedValue(
      createParsedDocumentFixture()
    );
    harness.chunkingConfigService.getDefaultConfig.mockRejectedValue(
      new Error("missing")
    );
  });

  it("should ensure tenant defaults before loading chunking config", async () => {
    await expect(
      harness.service.indexParsedDocument({
        tenantId,
        parsedDocumentId,
        ingestionJobId,
        bullJobId: "bull-1",
        queueName: "ingestion",
        force: false,
      })
    ).rejects.toMatchObject({
      code: "CHUNKING_CONFIG_NOT_FOUND",
      retryable: false,
    } satisfies Partial<IngestionError>);

    expect(
      harness.indexingDefaultsService.ensureTenantDefaults
    ).toHaveBeenCalledWith(tenantId);
    expect(harness.chunkingConfigService.getDefaultConfig).toHaveBeenCalledWith(
      tenantId
    );
    expect(
      harness.indexingDefaultsService.ensureTenantDefaults.mock
        .invocationCallOrder[0]
    ).toBeLessThan(
      harness.chunkingConfigService.getDefaultConfig.mock.invocationCallOrder[0]
    );
  });
});
