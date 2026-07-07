import { ConflictException } from "@nestjs/common";
import { describe, expect, it, jest } from "@jest/globals";
import {
  AttemptStatus,
  IngestionJobType,
  JobStatus,
} from "../../../generated/prisma/enums.js";
import { IngestionJobService } from "./ingestion-job.service.js";

const tenantId = "tenant_acme";
const jobId = "4e946c9e-ea1e-48d4-aa8e-7f3e4a29c41d";
const fileId = "113d5fe3-927e-428d-9b55-557a6f776ed9";
const sourceId = "adf1ed11-f72e-4af4-9a1b-9d6d9941d30e";
const knowledgeBaseId = "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4";

type MockFn = ReturnType<typeof jest.fn>;
type DelegateMock = Record<string, MockFn>;
type PrismaMock = {
  ingestionJob: DelegateMock;
  documentFile: DelegateMock;
  source: DelegateMock;
  parsedDocument: DelegateMock;
  $transaction: MockFn;
};

/**
 * Create a mock Prisma delegate.
 * @returns Mock delegate.
 */
function createDelegateMock(): DelegateMock {
  return {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
}

/**
 * Create a Prisma mock for ingestion job service tests.
 * @returns Prisma mock.
 */
function createPrismaMock(): PrismaMock {
  const prisma = {
    ingestionJob: createDelegateMock(),
    documentFile: createDelegateMock(),
    source: createDelegateMock(),
    parsedDocument: createDelegateMock(),
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation((work: (tx: PrismaMock) => unknown) =>
    work(prisma)
  );

  return prisma;
}

/**
 * Create an ingestion job fixture.
 * @param status - Job status.
 * @returns Ingestion job fixture.
 */
function createJobFixture(status: JobStatus = JobStatus.QUEUED) {
  return {
    id: jobId,
    tenantId,
    organizationId: null,
    projectId: null,
    knowledgeBaseId,
    sourceId,
    fileId,
    type: IngestionJobType.INGEST_FILE,
    status,
    idempotencyKey: "ingestion:key",
    queueName: "ingestion",
    bullJobId: "bull-1",
    priority: 0,
    attemptCount: 1,
    maxAttempts: 3,
    force: false,
    reason: "INITIAL_INGESTION",
    metadata: {
      requestedBy: "api-gateway",
      apiKey: "super-secret",
      rawText: "raw document text",
    },
    errorCode: null,
    errorMessage: null,
    startedAt: null,
    finishedAt: null,
    cancelledAt: null,
    createdAt: new Date("2026-07-04T00:00:00.000Z"),
    updatedAt: new Date("2026-07-04T00:00:00.000Z"),
    attempts: [
      {
        id: "attempt-1",
        attemptNumber: 1,
        status: AttemptStatus.STARTED,
        workerId: "worker-1",
        startedAt: new Date("2026-07-04T00:00:01.000Z"),
        finishedAt: null,
        durationMs: null,
        errorCode: null,
        errorMessage: null,
      },
    ],
  };
}

describe("IngestionJobService", () => {
  it("should redact sensitive metadata in safe job responses", async () => {
    const prisma = createPrismaMock();
    const service = new IngestionJobService(prisma as never);
    prisma.ingestionJob.findFirst.mockResolvedValue(createJobFixture());

    const result = await service.getById(jobId, tenantId);

    expect(result).toMatchObject({
      id: jobId,
      tenantId,
      metadata: {
        requestedBy: "api-gateway",
        apiKey: "[redacted]",
        rawText: "[redacted]",
      },
    });
    expect(JSON.stringify(result)).not.toContain("raw document text");
    expect(JSON.stringify(result)).not.toContain("super-secret");
  });

  it("should reject cancellation for processing jobs before mutating state", async () => {
    const prisma = createPrismaMock();
    const service = new IngestionJobService(prisma as never);

    await expect(
      service.cancelJob(createJobFixture(JobStatus.PROCESSING), false)
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("should update retry metadata safely", async () => {
    const prisma = createPrismaMock();
    const service = new IngestionJobService(prisma as never);
    prisma.ingestionJob.update.mockResolvedValue({
      ...createJobFixture(JobStatus.PENDING),
      metadata: {
        retryCount: 2,
        lastRetriedAt: "2026-07-04T00:00:00.000Z",
      },
    });

    await service.prepareRetry({
      id: jobId,
      status: JobStatus.FAILED,
      metadata: {
        retryCount: 1,
      },
    });

    expect(prisma.ingestionJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            retryCount: 2,
            lastRetriedAt: expect.any(String),
          }),
        }),
      })
    );
  });
});
