import { Inject, Injectable } from "@nestjs/common";
import { Job, UnrecoverableError } from "bullmq";
import { hostname } from "node:os";
import type { ConfigType } from "@nestjs/config";
import ingestionConfig from "../../../config/ingestion.config.js";
import { PinoLoggerService } from "../../../common/logger/pino-logger.service.js";
import { FileStatus, JobStatus } from "../../../generated/prisma/enums.js";
import { StorageService } from "../../storage/storage.service.js";
import {
  activeIngestionJobStatuses,
  ingestionBullJobName,
} from "../ingestion.constants.js";
import {
  createNonRetryableIngestionError,
  createRetryableIngestionError,
  toIngestionError,
  type IngestionQueuePayload,
} from "../ingestion.types.js";
import { DocumentParserService } from "../services/document-parser.service.js";
import { IngestionAttemptService } from "../services/ingestion-attempt.service.js";
import { IngestionJobService } from "../services/ingestion-job.service.js";

type ProcessableJobRecord = {
  id: string;
  tenantId: string;
  organizationId?: string | null;
  projectId?: string | null;
  knowledgeBaseId?: string | null;
  sourceId?: string | null;
  fileId?: string | null;
  status: JobStatus;
  force: boolean;
  attemptCount: number;
};

type FileScopedProcessableJob = ProcessableJobRecord & {
  knowledgeBaseId: string;
  sourceId: string;
  fileId: string;
};

type StartedAttemptRecord = {
  id: string;
  attemptNumber: number;
  startedAt: Date;
};

type WorkerFileRecord = {
  id: string;
  tenantId: string;
  knowledgeBaseId: string;
  sourceId: string;
  storageObjectId: string;
  originalName?: string | null;
  mimeType: string;
  checksumSha256: string;
  status: FileStatus;
  deletedAt?: Date | null;
  storageObject?: {
    id: string;
    deletedAt?: Date | null;
  } | null;
};

/**
 * Processes BullMQ ingestion jobs.
 */
@Injectable()
export class IngestionProcessor {
  private readonly hostname = hostname();
  private readonly workerId = `${this.hostname}:${process.pid}`;

  constructor(
    private readonly ingestionJobService: IngestionJobService,
    private readonly attemptService: IngestionAttemptService,
    private readonly parserService: DocumentParserService,
    private readonly storageService: StorageService,
    private readonly logger: PinoLoggerService,
    @Inject(ingestionConfig.KEY)
    private readonly ingestion: ConfigType<typeof ingestionConfig>
  ) {}

  /**
   * Process a BullMQ ingestion job with an application-level timeout.
   * @param job - BullMQ job.
   */
  async process(job: Job<IngestionQueuePayload>): Promise<void> {
    await runWithTimeout(
      this.processWithoutTimeout(job),
      this.ingestion.jobTimeoutMs
    );
  }

  /**
   * Process a BullMQ ingestion job.
   * @param job - BullMQ job.
   */
  private async processWithoutTimeout(
    job: Job<IngestionQueuePayload>
  ): Promise<void> {
    validateBullJob(job);

    const dbJob = (await this.ingestionJobService.getJobForProcessing(
      job.data.ingestionJobId,
      job.data.tenantId
    )) as ProcessableJobRecord;

    if (dbJob.status === JobStatus.CANCELLED) {
      await this.attemptService.recordCancelledAttempt(
        dbJob,
        this.workerId,
        this.hostname
      );
      return;
    }

    if (!isActiveIngestionJobStatus(dbJob.status)) {
      this.logger.warnPayload({
        event: "ingestion.document.skipped_unchanged",
        jobId: dbJob.id,
        bullJobId: job.id,
        tenantId: dbJob.tenantId,
        status: dbJob.status,
      });
      return;
    }

    const attempt = await this.attemptService.startAttempt(
      dbJob,
      this.workerId,
      this.hostname
    );

    this.logger.info({
      event: "ingestion.job.started",
      jobId: dbJob.id,
      bullJobId: job.id,
      queueName: job.queueName,
      attempt: attempt.attemptNumber,
      tenantId: dbJob.tenantId,
      knowledgeBaseId: dbJob.knowledgeBaseId,
      sourceId: dbJob.sourceId,
      fileId: dbJob.fileId,
      status: JobStatus.PROCESSING,
    });

    try {
      await this.processAttempt(job, dbJob, attempt);
    } catch (error) {
      await this.handleAttemptError(job, dbJob, attempt, error);
    }
  }

  /**
   * Run one ingestion attempt.
   * @param job - BullMQ job.
   * @param dbJob - Database ingestion job.
   * @param attempt - Database ingestion attempt.
   */
  private async processAttempt(
    job: Job<IngestionQueuePayload>,
    dbJob: ProcessableJobRecord,
    attempt: StartedAttemptRecord
  ): Promise<void> {
    ensureFileJobScope(dbJob);

    const file = (await this.ingestionJobService.findIngestibleFile(
      dbJob.fileId,
      dbJob.tenantId
    )) as WorkerFileRecord | null;
    ensureWorkerFileCanBeProcessed(file);

    const buffer = await this.readFileBuffer(
      file.storageObjectId,
      file.tenantId
    );
    const parsedDocument = await this.parserService.parse({
      buffer,
      mimeType: file.mimeType,
      originalName: file.originalName,
    });

    this.logger.info({
      event: "ingestion.parser.selected",
      jobId: dbJob.id,
      bullJobId: job.id,
      tenantId: dbJob.tenantId,
      knowledgeBaseId: dbJob.knowledgeBaseId,
      sourceId: dbJob.sourceId,
      fileId: dbJob.fileId,
      storageObjectId: file.storageObjectId,
      mimeType: parsedDocument.mimeType,
      checksumSha256: file.checksumSha256,
      parserName: parsedDocument.parserName,
      parserVersion: parsedDocument.parserVersion,
    });

    const existingParsedDocument =
      !dbJob.force &&
      (await this.ingestionJobService.findCompletedParsedDocument({
        tenantId: dbJob.tenantId,
        fileId: dbJob.fileId,
        contentHash: parsedDocument.contentHash,
        parserName: parsedDocument.parserName,
        parserVersion: parsedDocument.parserVersion,
      }));

    if (existingParsedDocument) {
      await this.ingestionJobService.skipUnchangedJob({
        jobId: dbJob.id,
        fileId: dbJob.fileId,
        sourceId: dbJob.sourceId,
        parsedDocumentId: existingParsedDocument.id,
        contentHash: parsedDocument.contentHash,
      });
      await this.attemptService.completeAttempt(attempt, {
        skippedUnchanged: true,
        contentHash: parsedDocument.contentHash,
      });

      this.logger.info({
        event: "ingestion.document.skipped_unchanged",
        jobId: dbJob.id,
        bullJobId: job.id,
        tenantId: dbJob.tenantId,
        knowledgeBaseId: dbJob.knowledgeBaseId,
        sourceId: dbJob.sourceId,
        fileId: dbJob.fileId,
        storageObjectId: file.storageObjectId,
        mimeType: parsedDocument.mimeType,
        checksumSha256: file.checksumSha256,
        contentHash: parsedDocument.contentHash,
        status: JobStatus.SKIPPED,
      });
      return;
    }

    const createdParsedDocument =
      await this.ingestionJobService.createParsedDocument({
        tenantId: dbJob.tenantId,
        organizationId: dbJob.organizationId,
        projectId: dbJob.projectId,
        knowledgeBaseId: dbJob.knowledgeBaseId,
        sourceId: dbJob.sourceId,
        fileId: dbJob.fileId,
        storageObjectId: file.storageObjectId,
        ingestionJobId: dbJob.id,
        parserName: parsedDocument.parserName,
        parserVersion: parsedDocument.parserVersion,
        mimeType: parsedDocument.mimeType,
        title: parsedDocument.title,
        language: parsedDocument.language,
        extractedText: parsedDocument.extractedText,
        textPreview: parsedDocument.textPreview,
        charCount: parsedDocument.charCount,
        contentHash: parsedDocument.contentHash,
        metadata: parsedDocument.metadata,
      });

    await this.ingestionJobService.completeJob({
      jobId: dbJob.id,
      fileId: dbJob.fileId,
      sourceId: dbJob.sourceId,
      parsedDocumentId: createdParsedDocument.id,
      contentHash: parsedDocument.contentHash,
    });
    await this.attemptService.completeAttempt(attempt, {
      contentHash: parsedDocument.contentHash,
      charCount: parsedDocument.charCount,
      textBytes: parsedDocument.textBytes,
      fullTextStored: parsedDocument.extractedText !== null,
    });

    this.logger.info({
      event: "ingestion.document.parsed",
      jobId: dbJob.id,
      bullJobId: job.id,
      tenantId: dbJob.tenantId,
      knowledgeBaseId: dbJob.knowledgeBaseId,
      sourceId: dbJob.sourceId,
      fileId: dbJob.fileId,
      storageObjectId: file.storageObjectId,
      mimeType: parsedDocument.mimeType,
      checksumSha256: file.checksumSha256,
      contentHash: parsedDocument.contentHash,
      status: JobStatus.COMPLETED,
    });
  }

  /**
   * Read file bytes from object storage.
   * @param storageObjectId - Storage object ID.
   * @param tenantId - Tenant ID.
   * @returns File buffer.
   */
  private async readFileBuffer(
    storageObjectId: string,
    tenantId: string
  ): Promise<Buffer> {
    try {
      return await this.storageService.getFileBuffer(storageObjectId, tenantId);
    } catch {
      throw createRetryableIngestionError(
        "STORAGE_READ_FAILED",
        "The stored file could not be read."
      );
    }
  }

  /**
   * Persist failure state and throw the correct BullMQ error.
   * @param job - BullMQ job.
   * @param dbJob - Database job.
   * @param attempt - Database attempt.
   * @param error - Caught error.
   */
  private async handleAttemptError(
    job: Job<IngestionQueuePayload>,
    dbJob: ProcessableJobRecord,
    attempt: StartedAttemptRecord,
    error: unknown
  ): Promise<never> {
    const ingestionError = toIngestionError(error);
    const retrying = shouldRetryBullJob(job, ingestionError.retryable);

    await this.attemptService.failAttempt(attempt, ingestionError, retrying);
    await this.ingestionJobService.failJob({
      jobId: dbJob.id,
      fileId: dbJob.fileId,
      sourceId: dbJob.sourceId,
      error: ingestionError,
      retrying,
    });

    this.logger.errorPayload({
      event: retrying ? "ingestion.job.retrying" : "ingestion.job.failed",
      jobId: dbJob.id,
      bullJobId: job.id,
      queueName: job.queueName,
      attempt: attempt.attemptNumber,
      tenantId: dbJob.tenantId,
      knowledgeBaseId: dbJob.knowledgeBaseId,
      sourceId: dbJob.sourceId,
      fileId: dbJob.fileId,
      status: retrying ? JobStatus.RETRYING : JobStatus.FAILED,
      errorCode: ingestionError.code,
    });

    if (!ingestionError.retryable) {
      throw new UnrecoverableError(ingestionError.message);
    }

    throw ingestionError;
  }
}

/**
 * Validate a BullMQ job payload shape.
 * @param job - BullMQ job.
 */
function validateBullJob(job: Job<IngestionQueuePayload>): void {
  if (job.name !== ingestionBullJobName) {
    throw new UnrecoverableError("Unsupported ingestion job name.");
  }

  const values = [
    job.data.ingestionJobId,
    job.data.tenantId,
    job.data.fileId,
    job.data.sourceId,
    job.data.knowledgeBaseId,
  ];

  if (values.some((value) => typeof value !== "string" || value.length === 0)) {
    throw new UnrecoverableError("Invalid ingestion job payload.");
  }
}

/**
 * Ensure a job is scoped to a file.
 * @param job - Database ingestion job.
 */
function ensureFileJobScope(
  job: ProcessableJobRecord
): asserts job is FileScopedProcessableJob {
  if (!job.fileId || !job.sourceId || !job.knowledgeBaseId) {
    throw createNonRetryableIngestionError(
      "FILE_NOT_FOUND",
      "Only file ingestion jobs are supported by this worker."
    );
  }
}

/**
 * Ensure worker file metadata is processable.
 * @param file - Document file metadata.
 */
function ensureWorkerFileCanBeProcessed(
  file: WorkerFileRecord | null
): asserts file is WorkerFileRecord & {
  storageObject: NonNullable<WorkerFileRecord["storageObject"]>;
} {
  if (!file) {
    throw createNonRetryableIngestionError(
      "FILE_NOT_FOUND",
      "The file for this ingestion job was not found."
    );
  }

  if (file.deletedAt || file.status === FileStatus.DELETED) {
    throw createNonRetryableIngestionError(
      "FILE_DELETED",
      "Deleted files cannot be ingested."
    );
  }

  if (!file.storageObject || file.storageObject.deletedAt) {
    throw createNonRetryableIngestionError(
      "STORAGE_OBJECT_NOT_FOUND",
      "The file storage object was not found."
    );
  }
}

/**
 * Decide whether BullMQ should retry a failed job.
 * @param job - BullMQ job.
 * @param retryable - Whether the error is retryable.
 * @returns True when another BullMQ attempt remains.
 */
function shouldRetryBullJob(
  job: Job<IngestionQueuePayload>,
  retryable: boolean
): boolean {
  const maxAttempts = job.opts.attempts ?? 1;
  const currentAttempt = job.attemptsMade + 1;

  return retryable && currentAttempt < maxAttempts;
}

/**
 * Check whether a job status is active.
 * @param status - Job status.
 * @returns True when the status is active.
 */
function isActiveIngestionJobStatus(status: JobStatus): boolean {
  return activeIngestionJobStatuses.some(
    (activeStatus) => activeStatus === status
  );
}

/**
 * Run a promise with a timeout.
 * @param work - Work promise.
 * @param timeoutMs - Timeout in milliseconds.
 */
async function runWithTimeout<T>(
  work: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(
        createRetryableIngestionError(
          "UNKNOWN_INGESTION_ERROR",
          "The ingestion job timed out."
        )
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([work, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
