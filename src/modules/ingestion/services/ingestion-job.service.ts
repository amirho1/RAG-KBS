import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../../../generated/prisma/client.js";
import {
  FileStatus,
  JobStatus,
  ParserStatus,
  ProcessingState,
} from "../../../generated/prisma/enums.js";
import type { MetadataJson } from "../../../common/dto/metadata.dto.js";
import { buildPaginatedResult } from "../../../common/metadata/pagination.js";
import { isPrismaUniqueConstraintError } from "../../../common/metadata/prisma-errors.js";
import { toPrismaNullableJson } from "../../../common/metadata/prisma-json.js";
import { serializeJsonResponse } from "../../../common/metadata/json-response.js";
import { buildOrderBy } from "../../../common/metadata/sorting.js";
import { redactSensitiveValue } from "../../../common/logger/log-redaction.js";
import { PrismaService } from "../../database/prisma.service.js";
import {
  activeIngestionJobStatuses,
  cancellableIngestionJobStatuses,
  reusableIngestionJobStatuses,
} from "../ingestion.constants.js";
import type { CreateIngestionJobInput } from "../dto/create-ingestion-job.dto.js";
import type { ListIngestionJobsQuery } from "../dto/ingestion-job-query.dto.js";
import type { IngestionError } from "../ingestion.types.js";

type IngestionJobWhereInput = Prisma.IngestionJobWhereInput;

type RetryableJobRecord = {
  id: string;
  status: JobStatus;
  metadata?: unknown;
};

type CancellableJobRecord = {
  id: string;
  status: JobStatus;
  metadata?: unknown;
  fileId?: string | null;
};

/**
 * Coordinates ingestion job persistence and state transitions.
 */
@Injectable()
export class IngestionJobService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a file and its storage object for ingestion.
   * @param fileId - Document file ID.
   * @param tenantId - Tenant ID.
   * @returns File metadata when found.
   */
  async findIngestibleFile(fileId: string, tenantId: string) {
    return this.prisma.documentFile.findFirst({
      where: {
        id: fileId,
        tenantId,
      },
      include: {
        storageObject: true,
        source: {
          select: {
            id: true,
            deletedAt: true,
          },
        },
      },
    });
  }

  /**
   * Find an active ingestion job for a file.
   * @param tenantId - Tenant ID.
   * @param fileId - Document file ID.
   * @returns Existing active job response when present.
   */
  async findActiveJobForFile(
    tenantId: string,
    fileId: string
  ): Promise<Record<string, unknown> | null> {
    const job = await this.prisma.ingestionJob.findFirst({
      where: {
        tenantId,
        fileId,
        deletedAt: null,
        status: {
          in: [...activeIngestionJobStatuses],
        },
      },
      include: this.getJobInclude(),
      orderBy: {
        createdAt: "desc",
      },
    });

    return job ? this.serializeJob(job) : null;
  }

  /**
   * Find a completed reusable ingestion job by idempotency key.
   * @param tenantId - Tenant ID.
   * @param idempotencyKey - Deterministic idempotency key.
   * @returns Reusable job response when present.
   */
  async findReusableJobByKey(
    tenantId: string,
    idempotencyKey: string
  ): Promise<Record<string, unknown> | null> {
    const job = await this.prisma.ingestionJob.findFirst({
      where: {
        tenantId,
        idempotencyKey,
        deletedAt: null,
        status: {
          in: [...reusableIngestionJobStatuses],
        },
      },
      include: this.getJobInclude(),
      orderBy: {
        createdAt: "desc",
      },
    });

    return job ? this.serializeJob(job) : null;
  }

  /**
   * Create a pending ingestion job and mark the file/source as queued.
   * @param input - Job creation input.
   * @returns Created ingestion job response.
   */
  async createPendingJob(input: {
    file: Awaited<ReturnType<IngestionJobService["findIngestibleFile"]>>;
    body: CreateIngestionJobInput;
    idempotencyKey: string;
    queueName: string;
    maxAttempts: number;
    type: "INGEST_FILE" | "REINGEST_FILE";
  }): Promise<Record<string, unknown>> {
    const file = input.file;

    if (!file) {
      throw new NotFoundException("File was not found.");
    }

    try {
      const job = await this.prisma.$transaction(async (tx) => {
        const createdJob = await tx.ingestionJob.create({
          data: {
            tenantId: file.tenantId,
            organizationId: file.organizationId,
            projectId: file.projectId,
            knowledgeBaseId: file.knowledgeBaseId,
            sourceId: file.sourceId,
            fileId: file.id,
            type: input.type,
            status: JobStatus.PENDING,
            idempotencyKey: input.idempotencyKey,
            queueName: input.queueName,
            maxAttempts: input.maxAttempts,
            force: input.body.force,
            reason: input.body.reason,
            metadata: toPrismaNullableJson(input.body.metadata),
          },
          include: this.getJobInclude(),
        });

        await tx.documentFile.update({
          where: { id: file.id },
          data: {
            status: FileStatus.WAITING_FOR_INGESTION,
            processingState: ProcessingState.QUEUED,
          },
        });

        await tx.source.update({
          where: { id: file.sourceId },
          data: {
            processingState: ProcessingState.QUEUED,
          },
        });

        return createdJob;
      });

      return this.serializeJob(job);
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        const existingJob = await this.findActiveJobForFile(
          file.tenantId,
          file.id
        );

        if (existingJob) {
          return existingJob;
        }

        throw new ConflictException(
          "An equivalent ingestion job already exists."
        );
      }

      throw error;
    }
  }

  /**
   * Mark a job as queued after a successful BullMQ push.
   * @param jobId - Ingestion job ID.
   * @param bullJobId - BullMQ job ID.
   * @returns Updated ingestion job response.
   */
  async markQueued(
    jobId: string,
    bullJobId: string
  ): Promise<Record<string, unknown>> {
    const job = await this.prisma.ingestionJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.QUEUED,
        bullJobId,
        queuedAt: new Date(),
      },
      include: this.getJobInclude(),
    });

    return this.serializeJob(job);
  }

  /**
   * Mark queue push failure safely.
   * @param jobId - Ingestion job ID.
   * @returns Failed ingestion job response.
   */
  async markQueueFailed(jobId: string): Promise<Record<string, unknown>> {
    const job = await this.prisma.$transaction(async (tx) => {
      const failedJob = await tx.ingestionJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.FAILED,
          errorCode: "QUEUE_ERROR",
          errorMessage: "The ingestion job could not be queued.",
          finishedAt: new Date(),
        },
        include: this.getJobInclude(),
      });

      if (failedJob.fileId) {
        await tx.documentFile.update({
          where: { id: failedJob.fileId },
          data: {
            status: FileStatus.FAILED,
            processingState: ProcessingState.FAILED,
          },
        });
      }

      if (failedJob.sourceId) {
        await tx.source.update({
          where: { id: failedJob.sourceId },
          data: {
            processingState: ProcessingState.FAILED,
          },
        });
      }

      return failedJob;
    });

    return this.serializeJob(job);
  }

  /**
   * Get one tenant-scoped ingestion job.
   * @param id - Ingestion job ID.
   * @param tenantId - Tenant ID.
   * @returns Safe ingestion job response.
   */
  async getById(
    id: string,
    tenantId: string
  ): Promise<Record<string, unknown>> {
    const job = await this.prisma.ingestionJob.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: this.getJobInclude(),
    });

    if (!job) {
      throw new NotFoundException("Ingestion job was not found.");
    }

    return this.serializeJob(job);
  }

  /**
   * List tenant-scoped ingestion jobs.
   * @param query - List query.
   * @returns Paginated ingestion jobs.
   */
  async list(query: ListIngestionJobsQuery) {
    const where = this.buildListWhere(query);
    const [items, total] = await Promise.all([
      this.prisma.ingestionJob.findMany({
        where,
        include: this.getJobInclude(),
        orderBy: buildOrderBy(query, "createdAt"),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.ingestionJob.count({ where }),
    ]);

    return buildPaginatedResult(
      items.map((item) => this.serializeJob(item)),
      query,
      total
    );
  }

  /**
   * Load a job for retry or cancellation.
   * @param id - Ingestion job ID.
   * @param tenantId - Tenant ID.
   * @returns Ingestion job with latest attempt.
   */
  async findJobRecord(id: string, tenantId: string) {
    const job = await this.prisma.ingestionJob.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: this.getJobInclude(),
    });

    if (!job) {
      throw new NotFoundException("Ingestion job was not found.");
    }

    return job;
  }

  /**
   * Reset a failed or cancelled job before requeueing.
   * @param job - Existing ingestion job.
   * @returns Reset job response.
   */
  async prepareRetry(
    job: RetryableJobRecord
  ): Promise<Record<string, unknown>> {
    const metadata = buildRetryMetadata(job.metadata);
    const retriedJob = await this.prisma.ingestionJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.PENDING,
        errorCode: null,
        errorMessage: null,
        errorDetails: Prisma.DbNull,
        finishedAt: null,
        cancelledAt: null,
        metadata: toPrismaNullableJson(
          metadata as Record<string, MetadataJson>
        ),
      },
      include: this.getJobInclude(),
    });

    return this.serializeJob(retriedJob);
  }

  /**
   * Cancel a pending or queued job.
   * @param job - Existing ingestion job.
   * @param bullJobRemoved - Whether BullMQ job removal succeeded.
   * @returns Cancelled job response.
   */
  async cancelJob(
    job: CancellableJobRecord,
    bullJobRemoved: boolean
  ): Promise<Record<string, unknown>> {
    if (
      !cancellableIngestionJobStatuses.some(
        (cancellableStatus) => cancellableStatus === job.status
      )
    ) {
      throw new ConflictException(
        "Only pending or queued ingestion jobs can be cancelled."
      );
    }

    const cancelledJob = await this.prisma.$transaction(async (tx) => {
      const updatedJob = await tx.ingestionJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.CANCELLED,
          cancelledAt: new Date(),
          finishedAt: new Date(),
          errorCode: "JOB_CANCELLED",
          errorMessage: "The ingestion job was cancelled before processing.",
          metadata: toPrismaNullableJson(
            mergeMetadata(job.metadata, {
              bullJobRemoved,
            }) as Record<string, MetadataJson>
          ),
        },
        include: this.getJobInclude(),
      });

      if (updatedJob.fileId) {
        await tx.documentFile.update({
          where: { id: updatedJob.fileId },
          data: {
            processingState: ProcessingState.CANCELLED,
          },
        });
      }

      return updatedJob;
    });

    return this.serializeJob(cancelledJob);
  }

  /**
   * Get an ingestion job for worker processing.
   * @param id - Ingestion job ID.
   * @param tenantId - Tenant ID.
   * @returns Ingestion job record.
   */
  async getJobForProcessing(id: string, tenantId: string) {
    const job = await this.prisma.ingestionJob.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!job) {
      throw new NotFoundException("Ingestion job was not found.");
    }

    return job;
  }

  /**
   * Store a successful parsed document and mark the job completed.
   * @param input - Completion input.
   */
  async completeJob(input: {
    jobId: string;
    fileId: string;
    sourceId: string;
    parsedDocumentId: string;
    contentHash: string;
  }): Promise<void> {
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.ingestionJob.update({
        where: { id: input.jobId },
        data: {
          status: JobStatus.COMPLETED,
          parsedDocumentId: input.parsedDocumentId,
          processedFiles: 1,
          errorCode: null,
          errorMessage: null,
          errorDetails: Prisma.DbNull,
          finishedAt: now,
        },
      });

      await tx.documentFile.update({
        where: { id: input.fileId },
        data: {
          status: FileStatus.INGESTED,
          processingState: ProcessingState.COMPLETED,
          contentHash: input.contentHash,
          lastIngestedAt: now,
        },
      });

      await tx.source.update({
        where: { id: input.sourceId },
        data: {
          processingState: ProcessingState.COMPLETED,
          contentHash: input.contentHash,
          lastIngestedAt: now,
        },
      });
    });
  }

  /**
   * Mark a job completed after parse, chunk, embed, and index work finishes.
   * @param input - Indexed completion input.
   */
  async completeIndexedJob(input: {
    jobId: string;
    fileId: string;
    sourceId: string;
    parsedDocumentId: string;
    contentHash: string;
    totalChunks: number;
    processedChunks: number;
  }): Promise<void> {
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.ingestionJob.update({
        where: { id: input.jobId },
        data: {
          status: JobStatus.COMPLETED,
          parsedDocumentId: input.parsedDocumentId,
          processedFiles: 1,
          totalChunks: input.totalChunks,
          processedChunks: input.processedChunks,
          errorCode: null,
          errorMessage: null,
          errorDetails: Prisma.DbNull,
          finishedAt: now,
        },
      });

      await tx.documentFile.update({
        where: { id: input.fileId },
        data: {
          status: FileStatus.INGESTED,
          processingState: ProcessingState.COMPLETED,
          contentHash: input.contentHash,
          lastIngestedAt: now,
          lastEmbeddedAt: now,
        },
      });

      await tx.source.update({
        where: { id: input.sourceId },
        data: {
          processingState: ProcessingState.COMPLETED,
          contentHash: input.contentHash,
          lastIngestedAt: now,
        },
      });
    });
  }

  /**
   * Mark unchanged content as skipped.
   * @param input - Skip input.
   */
  async skipUnchangedJob(input: {
    jobId: string;
    fileId: string;
    sourceId: string;
    parsedDocumentId: string;
    contentHash: string;
  }): Promise<void> {
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.ingestionJob.update({
        where: { id: input.jobId },
        data: {
          status: JobStatus.SKIPPED,
          parsedDocumentId: input.parsedDocumentId,
          processedFiles: 0,
          errorCode: null,
          errorMessage: null,
          errorDetails: Prisma.DbNull,
          finishedAt: now,
        },
      });

      await tx.documentFile.update({
        where: { id: input.fileId },
        data: {
          status: FileStatus.INGESTED,
          processingState: ProcessingState.SKIPPED,
          contentHash: input.contentHash,
          lastIngestedAt: now,
        },
      });

      await tx.source.update({
        where: { id: input.sourceId },
        data: {
          processingState: ProcessingState.COMPLETED,
          contentHash: input.contentHash,
          lastIngestedAt: now,
        },
      });
    });
  }

  /**
   * Mark a job as failed or retrying.
   * @param input - Failure input.
   */
  async failJob(input: {
    jobId: string;
    fileId?: string | null;
    sourceId?: string | null;
    error: IngestionError;
    retrying: boolean;
  }): Promise<void> {
    const status = input.retrying ? JobStatus.RETRYING : JobStatus.FAILED;
    const processingState = input.retrying
      ? ProcessingState.RETRYING
      : ProcessingState.FAILED;

    await this.prisma.$transaction(async (tx) => {
      await tx.ingestionJob.update({
        where: { id: input.jobId },
        data: {
          status,
          errorCode: input.error.code,
          errorMessage: input.error.message,
          errorDetails: toPrismaNullableJson(
            (input.error.details ?? null) as Record<string, MetadataJson> | null
          ),
          finishedAt: input.retrying ? undefined : new Date(),
        },
      });

      if (input.fileId) {
        await tx.documentFile.update({
          where: { id: input.fileId },
          data: {
            ...(input.retrying ? {} : { status: FileStatus.FAILED }),
            processingState,
          },
        });
      }

      if (input.sourceId) {
        await tx.source.update({
          where: { id: input.sourceId },
          data: {
            processingState,
          },
        });
      }
    });
  }

  /**
   * Create a completed ParsedDocument record.
   * @param input - Parsed document data.
   * @returns Created parsed document.
   */
  async createParsedDocument(input: {
    tenantId: string;
    organizationId?: string | null;
    projectId?: string | null;
    knowledgeBaseId: string;
    sourceId: string;
    fileId: string;
    storageObjectId: string;
    ingestionJobId: string;
    parserName: string;
    parserVersion: string;
    mimeType: string;
    title?: string;
    language?: string;
    extractedText: string | null;
    textPreview: string;
    charCount: number;
    contentHash: string;
    metadata: Record<string, unknown>;
  }) {
    const now = new Date();

    return this.prisma.parsedDocument.create({
      data: {
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        projectId: input.projectId,
        knowledgeBaseId: input.knowledgeBaseId,
        sourceId: input.sourceId,
        fileId: input.fileId,
        storageObjectId: input.storageObjectId,
        ingestionJobId: input.ingestionJobId,
        status: ParserStatus.COMPLETED,
        parserName: input.parserName,
        parserVersion: input.parserVersion,
        mimeType: input.mimeType,
        title: input.title,
        language: input.language,
        extractedText: input.extractedText,
        textPreview: input.textPreview,
        charCount: input.charCount,
        contentHash: input.contentHash,
        metadata: toPrismaNullableJson(
          input.metadata as Record<string, MetadataJson>
        ),
        startedAt: now,
        finishedAt: now,
      },
    });
  }

  /**
   * Find an existing completed parsed document with the same content hash.
   * @param input - Parsed document lookup input.
   * @returns Matching parsed document when present.
   */
  async findCompletedParsedDocument(input: {
    tenantId: string;
    fileId: string;
    contentHash: string;
    parserName: string;
    parserVersion: string;
  }) {
    return this.prisma.parsedDocument.findFirst({
      where: {
        tenantId: input.tenantId,
        fileId: input.fileId,
        contentHash: input.contentHash,
        parserName: input.parserName,
        parserVersion: input.parserVersion,
        status: ParserStatus.COMPLETED,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Build the Prisma include used for safe job responses.
   * @returns Prisma job include.
   */
  private getJobInclude() {
    return {
      attempts: {
        orderBy: {
          attemptNumber: "desc" as const,
        },
        take: 1,
        select: {
          id: true,
          attemptNumber: true,
          status: true,
          workerId: true,
          startedAt: true,
          finishedAt: true,
          durationMs: true,
          errorCode: true,
          errorMessage: true,
        },
      },
    };
  }

  /**
   * Build the Prisma filter for list queries.
   * @param query - List query.
   * @returns Prisma where input.
   */
  private buildListWhere(
    query: ListIngestionJobsQuery
  ): IngestionJobWhereInput {
    return {
      tenantId: query.tenantId,
      organizationId: query.organizationId,
      projectId: query.projectId,
      knowledgeBaseId: query.knowledgeBaseId,
      sourceId: query.sourceId,
      fileId: query.fileId,
      status: query.status,
      type: query.type,
      deletedAt: null,
      createdAt:
        query.createdAtFrom || query.createdAtTo
          ? {
              gte: query.createdAtFrom,
              lte: query.createdAtTo,
            }
          : undefined,
    };
  }

  /**
   * Serialize a job without exposing unsafe internals.
   * @param job - Prisma ingestion job.
   * @returns Safe job response.
   */
  private serializeJob(job: unknown): Record<string, unknown> {
    const serializedJob = serializeJsonResponse(job) as Record<string, any>;
    const attempts = Array.isArray(serializedJob.attempts)
      ? serializedJob.attempts
      : [];

    return {
      id: serializedJob.id,
      tenantId: serializedJob.tenantId,
      organizationId: serializedJob.organizationId,
      projectId: serializedJob.projectId,
      knowledgeBaseId: serializedJob.knowledgeBaseId,
      sourceId: serializedJob.sourceId,
      fileId: serializedJob.fileId,
      type: serializedJob.type,
      status: serializedJob.status,
      queueName: serializedJob.queueName,
      bullJobId: serializedJob.bullJobId,
      attemptCount: serializedJob.attemptCount,
      maxAttempts: serializedJob.maxAttempts,
      force: serializedJob.force,
      reason: serializedJob.reason,
      priority: serializedJob.priority,
      metadata: redactSensitiveValue(serializedJob.metadata) ?? null,
      errorCode: serializedJob.errorCode,
      errorMessage: serializedJob.errorMessage,
      startedAt: serializedJob.startedAt,
      finishedAt: serializedJob.finishedAt,
      cancelledAt: serializedJob.cancelledAt,
      createdAt: serializedJob.createdAt,
      updatedAt: serializedJob.updatedAt,
      latestAttempt: attempts[0] ?? null,
    };
  }
}

/**
 * Build retry metadata without exposing unsafe values.
 * @param value - Existing metadata.
 * @returns Updated metadata.
 */
function buildRetryMetadata(value: unknown) {
  const metadata = normalizeMetadata(value);
  const retryCount =
    typeof metadata.retryCount === "number" ? metadata.retryCount + 1 : 1;

  return {
    ...metadata,
    retryCount,
    lastRetriedAt: new Date().toISOString(),
  };
}

/**
 * Merge safe metadata values.
 * @param value - Existing metadata.
 * @param patch - Metadata patch.
 * @returns Updated metadata.
 */
function mergeMetadata(value: unknown, patch: Record<string, unknown>) {
  return {
    ...normalizeMetadata(value),
    ...patch,
  };
}

/**
 * Normalize unknown metadata to an object.
 * @param value - Unknown metadata value.
 * @returns Metadata object.
 */
function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}
