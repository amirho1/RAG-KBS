import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Job } from "bullmq";
import { UnrecoverableError } from "bullmq";
import { FileStatus, JobStatus } from "../../../generated/prisma/enums.js";
import { ingestionBullJobName } from "../ingestion.constants.js";
import {
  createNonRetryableIngestionError,
  createRetryableIngestionError,
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
  logger: {
    info: jest.MockedFunction<(...args: any[]) => void>;
    warnPayload: jest.MockedFunction<(...args: any[]) => void>;
    errorPayload: jest.MockedFunction<(...args: any[]) => void>;
  };
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
 * Create parsed document result fixture.
 * @param text - Parsed text.
 * @returns Parsed document result fixture.
 */
function createParsedDocumentResult(text = "hello") {
  return {
    parserName: "text",
    parserVersion: "1.0.0",
    mimeType: "text/plain",
    text,
    extractedText: text,
    textPreview: text,
    contentHash:
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    charCount: text.length,
    textBytes: Buffer.byteLength(text, "utf8"),
    metadata: {},
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
  const logger = {
    info: jest.fn<(...args: any[]) => void>(),
    warnPayload: jest.fn<(...args: any[]) => void>(),
    errorPayload: jest.fn<(...args: any[]) => void>(),
  };
  const processor = new IngestionProcessor(
    ingestionJobService as never,
    attemptService as never,
    parserService as never,
    storageService as never,
    logger as never,
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
    logger,
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
    harness.parserService.parse.mockResolvedValue(createParsedDocumentResult());
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
    expect(JSON.stringify(harness.logger.info.mock.calls)).not.toContain(
      "hello"
    );
  });

  it("should parse and complete a Markdown ingestion job", async () => {
    harness.ingestionJobService.getJobForProcessing.mockResolvedValue(
      createDatabaseJob()
    );
    harness.attemptService.startAttempt.mockResolvedValue({
      id: "attempt-1",
      attemptNumber: 1,
      startedAt: new Date(),
    });
    harness.ingestionJobService.findIngestibleFile.mockResolvedValue({
      ...createFileFixture(),
      originalName: "guide.md",
      mimeType: "text/markdown",
    });
    harness.storageService.getFileBuffer.mockResolvedValue(
      Buffer.from("# Guide", "utf8")
    );
    harness.parserService.parse.mockResolvedValue({
      ...createParsedDocumentResult("# Guide"),
      parserName: "markdown",
      mimeType: "text/markdown",
      title: "Guide",
    });
    harness.ingestionJobService.findCompletedParsedDocument.mockResolvedValue(
      null
    );
    harness.ingestionJobService.createParsedDocument.mockResolvedValue({
      id: "parsed-1",
    });

    await harness.processor.process(createBullJob());

    expect(harness.parserService.parse).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: "text/markdown",
      })
    );
    expect(harness.ingestionJobService.completeJob).toHaveBeenCalled();
  });

  it("should skip unchanged parsed content when force is false", async () => {
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
    harness.parserService.parse.mockResolvedValue(createParsedDocumentResult());
    harness.ingestionJobService.findCompletedParsedDocument.mockResolvedValue({
      id: "parsed-existing",
    });

    await harness.processor.process(createBullJob());

    expect(harness.ingestionJobService.skipUnchangedJob).toHaveBeenCalledWith(
      expect.objectContaining({
        parsedDocumentId: "parsed-existing",
      })
    );
    expect(
      harness.ingestionJobService.createParsedDocument
    ).not.toHaveBeenCalled();
  });

  it("should record a cancelled attempt for cancelled jobs", async () => {
    harness.ingestionJobService.getJobForProcessing.mockResolvedValue({
      ...createDatabaseJob(),
      status: JobStatus.CANCELLED,
    });

    await harness.processor.process(createBullJob());

    expect(harness.attemptService.recordCancelledAttempt).toHaveBeenCalled();
    expect(harness.attemptService.startAttempt).not.toHaveBeenCalled();
  });

  it("should fail safely when the BullMQ payload does not match database scope", async () => {
    harness.ingestionJobService.getJobForProcessing.mockResolvedValue(
      createDatabaseJob()
    );
    harness.attemptService.startAttempt.mockResolvedValue({
      id: "attempt-1",
      attemptNumber: 1,
      startedAt: new Date(),
    });

    await expect(
      harness.processor.process({
        ...createBullJob(),
        data: {
          ...createBullJob().data,
          fileId: "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b",
        },
      } as Job<IngestionQueuePayload>)
    ).rejects.toThrow(UnrecoverableError);
    expect(harness.attemptService.failAttempt).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        code: "UNKNOWN_INGESTION_ERROR",
      }),
      false
    );
  });

  it("should mark storage read failures as retrying when attempts remain", async () => {
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
    harness.storageService.getFileBuffer.mockRejectedValue(
      new Error("storage path /secret/file.txt")
    );

    await expect(
      harness.processor.process(createBullJob())
    ).rejects.toMatchObject({
      code: "STORAGE_READ_FAILED",
    });
    expect(harness.attemptService.failAttempt).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ code: "STORAGE_READ_FAILED" }),
      true
    );
    expect(harness.ingestionJobService.failJob).toHaveBeenCalledWith(
      expect.objectContaining({
        retrying: true,
      })
    );
  });

  it("should map Prisma failures to retryable database errors", async () => {
    const prismaError = new Error("database_url=postgresql://secret");
    prismaError.name = "PrismaClientKnownRequestError";
    (prismaError as Error & { code?: string }).code = "P1001";
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
    harness.parserService.parse.mockResolvedValue(createParsedDocumentResult());
    harness.ingestionJobService.findCompletedParsedDocument.mockResolvedValue(
      null
    );
    harness.ingestionJobService.createParsedDocument.mockRejectedValue(
      prismaError
    );

    await expect(
      harness.processor.process(createBullJob())
    ).rejects.toMatchObject({
      code: "DATABASE_ERROR",
    });
    expect(harness.attemptService.failAttempt).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ code: "DATABASE_ERROR" }),
      true
    );
  });

  it("should mark deleted files as non-retryable failures", async () => {
    harness.ingestionJobService.getJobForProcessing.mockResolvedValue(
      createDatabaseJob()
    );
    harness.attemptService.startAttempt.mockResolvedValue({
      id: "attempt-1",
      attemptNumber: 1,
      startedAt: new Date(),
    });
    harness.ingestionJobService.findIngestibleFile.mockResolvedValue({
      ...createFileFixture(),
      status: FileStatus.DELETED,
      deletedAt: new Date(),
    });

    await expect(harness.processor.process(createBullJob())).rejects.toThrow(
      UnrecoverableError
    );
    expect(harness.attemptService.failAttempt).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ code: "FILE_DELETED" }),
      false
    );
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

  it("should mark retryable parser errors as retrying", async () => {
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
      createRetryableIngestionError(
        "PARSER_FAILED",
        "The document parser failed while extracting text."
      )
    );

    await expect(
      harness.processor.process(createBullJob())
    ).rejects.toMatchObject({
      code: "PARSER_FAILED",
    });
    expect(harness.attemptService.failAttempt).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ code: "PARSER_FAILED" }),
      true
    );
  });
});
