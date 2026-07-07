import { jest, describe, expect, it, beforeEach } from "@jest/globals";
import {
  FileStatus,
  IngestionJobType,
  JobStatus,
  ProcessingState,
} from "../../../generated/prisma/enums.js";
import { IngestionService } from "./ingestion.service.js";

const tenantId = "tenant_acme";
const fileId = "113d5fe3-927e-428d-9b55-557a6f776ed9";
const sourceId = "adf1ed11-f72e-4af4-9a1b-9d6d9941d30e";
const knowledgeBaseId = "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4";
const ingestionJobId = "4e946c9e-ea1e-48d4-aa8e-7f3e4a29c41d";

type ServiceHarness = {
  service: IngestionService;
  ingestionJobService: Record<string, AsyncMock>;
  queueService: Record<string, AsyncMock>;
};

type AsyncMock = jest.Mock<(...args: any[]) => Promise<any>>;

/**
 * Create a typed async Jest mock.
 * @returns Typed async mock.
 */
function createAsyncMock(): AsyncMock {
  return jest.fn<(...args: any[]) => Promise<any>>();
}

/**
 * Create a valid document file fixture.
 * @returns Document file fixture.
 */
function createFileFixture() {
  return {
    id: fileId,
    tenantId,
    organizationId: null,
    projectId: null,
    knowledgeBaseId,
    sourceId,
    storageObjectId: "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b",
    originalName: "manual.txt",
    mimeType: "text/plain",
    checksumSha256:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    status: FileStatus.STORED,
    processingState: ProcessingState.NOT_STARTED,
    deletedAt: null,
    source: {
      id: sourceId,
      deletedAt: null,
    },
    storageObject: {
      id: "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b",
      deletedAt: null,
    },
  };
}

/**
 * Create a safe ingestion job response fixture.
 * @param status - Job status.
 * @returns Ingestion job response.
 */
function createJobFixture(status: JobStatus) {
  return {
    id: ingestionJobId,
    tenantId,
    knowledgeBaseId,
    sourceId,
    fileId,
    type: IngestionJobType.INGEST_FILE,
    status,
    queueName: "ingestion",
    bullJobId: status === JobStatus.QUEUED ? "bull-1" : null,
    attemptCount: 0,
    maxAttempts: 3,
    force: false,
    priority: 0,
  };
}

/**
 * Create ingestion service test harness.
 * @returns Service harness.
 */
function createServiceHarness(): ServiceHarness {
  const ingestionJobService = {
    findIngestibleFile: createAsyncMock(),
    findActiveJobForFile: createAsyncMock(),
    findReusableJobByKey: createAsyncMock(),
    createPendingJob: createAsyncMock(),
    markQueued: createAsyncMock(),
    markQueueFailed: createAsyncMock(),
    getById: createAsyncMock(),
    list: createAsyncMock(),
    findJobRecord: createAsyncMock(),
    prepareRetry: createAsyncMock(),
    cancelJob: createAsyncMock(),
  };
  const parserService = {
    ensureMimeTypeIsSupported: jest.fn(),
    getParserForMimeType: jest.fn(() => ({
      parserName: "text",
      parserVersion: "1.0.0",
    })),
  };
  const queueService = {
    addIngestionJob: createAsyncMock(),
    removeJob: createAsyncMock(),
  };
  const service = new IngestionService(
    ingestionJobService as never,
    {
      generateKey: jest.fn(() => "ingestion:key"),
    },
    parserService as never,
    queueService as never,
    {
      info: jest.fn(),
      warnPayload: jest.fn(),
    } as never,
    {
      getRequestId: jest.fn(() => "req_test"),
    } as never,
    {
      queueName: "ingestion",
      concurrency: 3,
      maxAttempts: 3,
      backoffDelayMs: 5_000,
      removeOnCompleteCount: 1_000,
      removeOnFailCount: 5_000,
      jobTimeoutMs: 120_000,
      maxTextContentBytes: 1_048_576,
      textPreviewLength: 1_000,
      maxUploadSizeMb: 50,
    }
  );

  return {
    service,
    ingestionJobService,
    queueService,
  };
}

describe("IngestionService", () => {
  let harness: ServiceHarness;

  beforeEach(() => {
    harness = createServiceHarness();
  });

  it("should create and queue a new file ingestion job", async () => {
    const file = createFileFixture();
    const pendingJob = createJobFixture(JobStatus.PENDING);
    const queuedJob = createJobFixture(JobStatus.QUEUED);
    harness.ingestionJobService.findIngestibleFile.mockResolvedValue(file);
    harness.ingestionJobService.findActiveJobForFile.mockResolvedValue(null);
    harness.ingestionJobService.findReusableJobByKey.mockResolvedValue(null);
    harness.ingestionJobService.createPendingJob.mockResolvedValue(pendingJob);
    harness.queueService.addIngestionJob.mockResolvedValue("bull-1");
    harness.ingestionJobService.markQueued.mockResolvedValue(queuedJob);

    const result = await harness.service.createFileIngestionJob(fileId, {
      tenantId,
      force: false,
      reason: "INITIAL_INGESTION",
    });

    expect(result.status).toBe(JobStatus.QUEUED);
    expect(harness.queueService.addIngestionJob).toHaveBeenCalledWith(
      {
        ingestionJobId,
        tenantId,
        fileId,
        sourceId,
        knowledgeBaseId,
        force: false,
      },
      0
    );
  });

  it("should return an active duplicate without queueing another job", async () => {
    const activeJob = createJobFixture(JobStatus.QUEUED);
    harness.ingestionJobService.findIngestibleFile.mockResolvedValue(
      createFileFixture()
    );
    harness.ingestionJobService.findActiveJobForFile.mockResolvedValue(
      activeJob
    );

    const result = await harness.service.createFileIngestionJob(fileId, {
      tenantId,
      force: false,
      reason: "INITIAL_INGESTION",
    });

    expect(result).toBe(activeJob);
    expect(harness.queueService.addIngestionJob).not.toHaveBeenCalled();
  });

  it("should retry a failed job by removing the old BullMQ job and queueing again", async () => {
    const failedJob = {
      ...createJobFixture(JobStatus.FAILED),
      bullJobId: "bull-old",
    };
    const pendingJob = createJobFixture(JobStatus.PENDING);
    const queuedJob = createJobFixture(JobStatus.QUEUED);
    harness.ingestionJobService.findJobRecord.mockResolvedValue(failedJob);
    harness.ingestionJobService.findActiveJobForFile.mockResolvedValue(null);
    harness.queueService.removeJob.mockResolvedValue(true);
    harness.ingestionJobService.prepareRetry.mockResolvedValue(pendingJob);
    harness.queueService.addIngestionJob.mockResolvedValue("bull-1");
    harness.ingestionJobService.markQueued.mockResolvedValue(queuedJob);

    const result = await harness.service.retryJob(ingestionJobId, { tenantId });

    expect(result.status).toBe(JobStatus.QUEUED);
    expect(harness.queueService.removeJob).toHaveBeenCalledWith("bull-old");
  });

  it("should cancel a queued job", async () => {
    const queuedJob = createJobFixture(JobStatus.QUEUED);
    harness.ingestionJobService.findJobRecord.mockResolvedValue(queuedJob);
    harness.queueService.removeJob.mockResolvedValue(true);
    harness.ingestionJobService.cancelJob.mockResolvedValue({
      ...queuedJob,
      status: JobStatus.CANCELLED,
    });

    const result = await harness.service.cancelJob(ingestionJobId, {
      tenantId,
    });

    expect(result.status).toBe(JobStatus.CANCELLED);
    expect(harness.ingestionJobService.cancelJob).toHaveBeenCalledWith(
      queuedJob,
      true
    );
  });
});
