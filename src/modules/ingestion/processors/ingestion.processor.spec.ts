import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Job } from "bullmq";
import { UnrecoverableError } from "bullmq";
import { JobStatus } from "../../../generated/prisma/enums.js";
import { ingestionBullJobName } from "../ingestion.constants.js";
import {
  createNonRetryableIngestionError,
  type IngestionQueuePayload,
} from "../ingestion.types.js";
import { IngestionProcessor } from "./ingestion.processor.js";

const tenantId = "tenant_acme";
const jobId = "4e946c9e-ea1e-48d4-aa8e-7f3e4a29c41d";
const fileId = "113d5fe3-927e-428d-9b55-557a6f776ed9";
const sourceId = "adf1ed11-f72e-4af4-9a1b-9d6d9941d30e";
const knowledgeBaseId = "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4";
const storageObjectId = "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b";

type ProcessorHarness = {
  processor: IngestionProcessor;
  ingestionJobService: Record<string, AsyncMock>;
  attemptService: Record<string, AsyncMock>;
  parserService: Record<string, AsyncMock>;
  storageService: Record<string, AsyncMock>;
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
 * Create a BullMQ job fixture.
 * @returns BullMQ job fixture.
 */
function createBullJob(): Job<IngestionQueuePayload> {
  return {
    id: "bull-1",
    name: ingestionBullJobName,
    queueName: "ingestion",
    attemptsMade: 0,
    opts: {
      attempts: 3,
    },
    data: {
      ingestionJobId: jobId,
      tenantId,
      fileId,
      sourceId,
      knowledgeBaseId,
      force: false,
    },
  } as Job<IngestionQueuePayload>;
}

/**
 * Create database job fixture.
 * @returns Database ingestion job fixture.
 */
function createDatabaseJob() {
  return {
    id: jobId,
    tenantId,
    organizationId: null,
    projectId: null,
    knowledgeBaseId,
    sourceId,
    fileId,
    status: JobStatus.QUEUED,
    attemptCount: 0,
    force: false,
  };
}

/**
 * Create document file fixture.
 * @returns Document file fixture.
 */
function createFileFixture() {
  return {
    id: fileId,
    tenantId,
    knowledgeBaseId,
    sourceId,
    storageObjectId,
    originalName: "manual.txt",
    mimeType: "text/plain",
    checksumSha256:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    deletedAt: null,
    status: "STORED",
    storageObject: {
      id: storageObjectId,
      deletedAt: null,
    },
  };
}

/**
 * Create processor test harness.
 * @returns Processor harness.
 */
function createProcessorHarness(): ProcessorHarness {
  const ingestionJobService = {
    getJobForProcessing: createAsyncMock(),
    findIngestibleFile: createAsyncMock(),
    findCompletedParsedDocument: createAsyncMock(),
    createParsedDocument: createAsyncMock(),
    completeJob: createAsyncMock(),
    skipUnchangedJob: createAsyncMock(),
    failJob: createAsyncMock(),
  };
  const attemptService = {
    startAttempt: createAsyncMock(),
    completeAttempt: createAsyncMock(),
    failAttempt: createAsyncMock(),
    recordCancelledAttempt: createAsyncMock(),
  };
  const parserService = {
    parse: createAsyncMock(),
  };
  const storageService = {
    getFileBuffer: createAsyncMock(),
  };
  const processor = new IngestionProcessor(
    ingestionJobService as never,
    attemptService as never,
    parserService as never,
    storageService as never,
    {
      info: jest.fn(),
      warnPayload: jest.fn(),
      errorPayload: jest.fn(),
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
    processor,
    ingestionJobService,
    attemptService,
    parserService,
    storageService,
  };
}

describe("IngestionProcessor", () => {
  let harness: ProcessorHarness;

  beforeEach(() => {
    harness = createProcessorHarness();
  });

  it("should parse and complete a text ingestion job", async () => {
    harness.ingestionJobService.getJobForProcessing.mockResolvedValue(
      createDatabaseJob()
    );
    harness.attemptService.startAttempt.mockResolvedValue({
      id: "attempt-1",
      attemptNumber: 1,
      startedAt: new Date(),
    });
    harness.ingestionJobService.findIngestibleFile.mockResolvedValue(
      createFileFixture()
    );
    harness.storageService.getFileBuffer.mockResolvedValue(
      Buffer.from("hello", "utf8")
    );
    harness.parserService.parse.mockResolvedValue({
      parserName: "text",
      parserVersion: "1.0.0",
      mimeType: "text/plain",
      text: "hello",
      extractedText: "hello",
      textPreview: "hello",
      contentHash:
        "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
      charCount: 5,
      textBytes: 5,
      metadata: {},
    });
    harness.ingestionJobService.findCompletedParsedDocument.mockResolvedValue(
      null
    );
    harness.ingestionJobService.createParsedDocument.mockResolvedValue({
      id: "parsed-1",
    });

    await harness.processor.process(createBullJob());

    expect(harness.ingestionJobService.createParsedDocument).toHaveBeenCalled();
    expect(harness.ingestionJobService.completeJob).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId,
        parsedDocumentId: "parsed-1",
      })
    );
    expect(harness.attemptService.completeAttempt).toHaveBeenCalled();
  });

  it("should mark non-retryable parser errors as failed", async () => {
    harness.ingestionJobService.getJobForProcessing.mockResolvedValue(
      createDatabaseJob()
    );
    harness.attemptService.startAttempt.mockResolvedValue({
      id: "attempt-1",
      attemptNumber: 1,
      startedAt: new Date(),
    });
    harness.ingestionJobService.findIngestibleFile.mockResolvedValue(
      createFileFixture()
    );
    harness.storageService.getFileBuffer.mockResolvedValue(
      Buffer.from("hello", "utf8")
    );
    harness.parserService.parse.mockRejectedValue(
      createNonRetryableIngestionError(
        "UNSUPPORTED_MIME_TYPE",
        "This file type is not supported by the current ingestion pipeline."
      )
    );

    await expect(harness.processor.process(createBullJob())).rejects.toThrow(
      UnrecoverableError
    );
    expect(harness.attemptService.failAttempt).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ code: "UNSUPPORTED_MIME_TYPE" }),
      false
    );
    expect(harness.ingestionJobService.failJob).toHaveBeenCalledWith(
      expect.objectContaining({
        retrying: false,
      })
    );
  });
});
