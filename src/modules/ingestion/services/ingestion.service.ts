import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import ingestionConfig from "../../../config/ingestion.config.js";
import { PinoLoggerService } from "../../../common/logger/pino-logger.service.js";
import { RequestContextService } from "../../../common/request-context/request-context.service.js";
import type { TenantQuery } from "../../../common/dto/tenant-query.dto.js";
import {
  FileStatus,
  IngestionJobType,
  JobStatus,
} from "../../../generated/prisma/enums.js";
import {
  activeIngestionJobStatuses,
  cancellableIngestionJobStatuses,
  retryableIngestionJobStatuses,
} from "../ingestion.constants.js";
import type { CreateIngestionJobInput } from "../dto/create-ingestion-job.dto.js";
import type { ListIngestionJobsQuery } from "../dto/ingestion-job-query.dto.js";
import { DocumentParserService } from "./document-parser.service.js";
import { IngestionIdempotencyService } from "./ingestion-idempotency.service.js";
import { IngestionJobService } from "./ingestion-job.service.js";
import { IngestionQueueService } from "./ingestion-queue.service.js";
import { IngestionError } from "../ingestion.types.js";

type IngestibleFileRecord = {
  id: string;
  tenantId: string;
  knowledgeBaseId: string;
  sourceId: string;
  checksumSha256: string;
  mimeType: string;
  status: FileStatus;
  deletedAt?: Date | null;
  storageObject?: {
    deletedAt?: Date | null;
  } | null;
  source?: {
    deletedAt?: Date | null;
  } | null;
};

type FileScopedJob = {
  fileId?: string | null;
  sourceId?: string | null;
  knowledgeBaseId?: string | null;
};

type RequiredFileScopedJob = {
  fileId: string;
  sourceId: string;
  knowledgeBaseId: string;
};

type IngestionJobQueueResponse = FileScopedJob & {
  id: string;
  tenantId: string;
  status: JobStatus;
  queueName: string;
  bullJobId?: string | null;
  force?: boolean | null;
  priority?: number | null;
};

/**
 * Application service for ingestion API workflows.
 */
@Injectable()
export class IngestionService {
  constructor(
    private readonly ingestionJobService: IngestionJobService,
    private readonly idempotencyService: IngestionIdempotencyService,
    private readonly parserService: DocumentParserService,
    private readonly queueService: IngestionQueueService,
    private readonly logger: PinoLoggerService,
    private readonly requestContextService: RequestContextService,
    @Inject(ingestionConfig.KEY)
    private readonly ingestion: ConfigType<typeof ingestionConfig>
  ) {}

  /**
   * Create or return an ingestion job for a file.
   * @param fileId - Document file ID.
   * @param body - Create request body.
   * @returns Safe ingestion job response.
   */
  async createFileIngestionJob(
    fileId: string,
    body: CreateIngestionJobInput
  ): Promise<Record<string, unknown>> {
    const file = await this.ingestionJobService.findIngestibleFile(
      fileId,
      body.tenantId
    );
    this.ensureFileCanBeIngested(file);

    const activeJob = await this.ingestionJobService.findActiveJobForFile(
      body.tenantId,
      file.id
    );

    if (activeJob) {
      return activeJob;
    }

    const parser = this.parserService.getParserForMimeType(file.mimeType);
    const type = body.force
      ? IngestionJobType.REINGEST_FILE
      : IngestionJobType.INGEST_FILE;
    const idempotencyKey = this.idempotencyService.generateKey({
      tenantId: body.tenantId,
      fileId: file.id,
      checksumSha256: file.checksumSha256,
      jobType: type,
      parserVersion: parser.parserVersion,
      force: body.force,
    });

    if (!body.force) {
      const reusableJob = await this.ingestionJobService.findReusableJobByKey(
        body.tenantId,
        idempotencyKey
      );

      if (reusableJob) {
        return reusableJob;
      }
    }

    const pendingJob = (await this.ingestionJobService.createPendingJob({
      file,
      body,
      idempotencyKey,
      queueName: this.ingestion.queueName,
      maxAttempts: this.ingestion.maxAttempts,
      type,
    })) as IngestionJobQueueResponse;

    this.logger.info({
      event: "ingestion.job.created",
      requestId: this.requestContextService.getRequestId(),
      tenantId: body.tenantId,
      knowledgeBaseId: file.knowledgeBaseId,
      sourceId: file.sourceId,
      fileId: file.id,
      jobId: pendingJob.id,
      queueName: this.ingestion.queueName,
      status: pendingJob.status,
    });

    return this.queuePendingJob(pendingJob);
  }

  /**
   * Get one tenant-scoped ingestion job.
   * @param id - Ingestion job ID.
   * @param tenantId - Tenant ID.
   * @returns Safe ingestion job response.
   */
  getById(id: string, tenantId: string): Promise<Record<string, unknown>> {
    return this.ingestionJobService.getById(id, tenantId);
  }

  /**
   * List tenant-scoped ingestion jobs.
   * @param query - List query.
   * @returns Paginated ingestion jobs.
   */
  list(query: ListIngestionJobsQuery) {
    return this.ingestionJobService.list(query);
  }

  /**
   * Retry a failed or cancelled ingestion job.
   * @param id - Ingestion job ID.
   * @param query - Tenant query.
   * @returns Requeued ingestion job response.
   */
  async retryJob(
    id: string,
    query: TenantQuery
  ): Promise<Record<string, unknown>> {
    const job = await this.ingestionJobService.findJobRecord(
      id,
      query.tenantId
    );

    if (
      !retryableIngestionJobStatuses.some(
        (retryableStatus) => retryableStatus === job.status
      )
    ) {
      throw new ConflictException(
        "Only failed or cancelled ingestion jobs can be retried."
      );
    }

    this.ensureJobHasFileScope(job);

    const activeJob = await this.ingestionJobService.findActiveJobForFile(
      query.tenantId,
      job.fileId
    );

    if (activeJob && activeJob.id !== job.id) {
      return activeJob;
    }

    await this.queueService.removeJob(job.bullJobId ?? job.id);
    const pendingJob = (await this.ingestionJobService.prepareRetry(
      job
    )) as IngestionJobQueueResponse;

    this.logger.info({
      event: "ingestion.job.retrying",
      requestId: this.requestContextService.getRequestId(),
      tenantId: job.tenantId,
      knowledgeBaseId: job.knowledgeBaseId,
      sourceId: job.sourceId,
      fileId: job.fileId,
      jobId: job.id,
      queueName: this.ingestion.queueName,
      status: JobStatus.RETRYING,
    });

    return this.queuePendingJob(pendingJob);
  }

  /**
   * Cancel a pending or queued ingestion job.
   * @param id - Ingestion job ID.
   * @param query - Tenant query.
   * @returns Cancelled ingestion job response.
   */
  async cancelJob(
    id: string,
    query: TenantQuery
  ): Promise<Record<string, unknown>> {
    const job = await this.ingestionJobService.findJobRecord(
      id,
      query.tenantId
    );

    if (
      !cancellableIngestionJobStatuses.some(
        (cancellableStatus) => cancellableStatus === job.status
      )
    ) {
      throw new ConflictException(
        "Only pending or queued ingestion jobs can be cancelled."
      );
    }

    const bullJobRemoved = await this.queueService.removeJob(
      job.bullJobId ?? job.id
    );
    const cancelledJob = await this.ingestionJobService.cancelJob(
      job,
      bullJobRemoved
    );

    this.logger.warnPayload({
      event: "ingestion.job.cancelled",
      requestId: this.requestContextService.getRequestId(),
      tenantId: job.tenantId,
      knowledgeBaseId: job.knowledgeBaseId,
      sourceId: job.sourceId,
      fileId: job.fileId,
      jobId: job.id,
      queueName: this.ingestion.queueName,
      status: JobStatus.CANCELLED,
    });

    return cancelledJob;
  }

  /**
   * Queue a pending ingestion job and update its BullMQ ID.
   * @param job - Pending ingestion job response.
   * @returns Queued ingestion job response.
   */
  private async queuePendingJob(
    job: IngestionJobQueueResponse
  ): Promise<Record<string, unknown>> {
    if (
      job.status !== JobStatus.PENDING ||
      !activeIngestionJobStatuses.includes(job.status)
    ) {
      return job;
    }

    this.ensureJobHasFileScope(job);

    try {
      const bullJobId = await this.queueService.addIngestionJob(
        {
          ingestionJobId: job.id,
          tenantId: job.tenantId,
          fileId: job.fileId,
          sourceId: job.sourceId,
          knowledgeBaseId: job.knowledgeBaseId,
          force: Boolean(job.force),
        },
        Number(job.priority ?? 0)
      );
      const queuedJob = await this.ingestionJobService.markQueued(
        job.id,
        bullJobId
      );

      this.logger.info({
        event: "ingestion.job.queued",
        requestId: this.requestContextService.getRequestId(),
        tenantId: job.tenantId,
        knowledgeBaseId: job.knowledgeBaseId,
        sourceId: job.sourceId,
        fileId: job.fileId,
        jobId: job.id,
        bullJobId,
        queueName: this.ingestion.queueName,
        status: JobStatus.QUEUED,
      });

      return queuedJob;
    } catch {
      await this.ingestionJobService.markQueueFailed(job.id);
      throw new ServiceUnavailableException(
        "The ingestion job could not be queued."
      );
    }
  }

  /**
   * Ensure a file can be ingested.
   * @param file - Document file with storage metadata.
   */
  private ensureFileCanBeIngested(
    file: IngestibleFileRecord | null
  ): asserts file is IngestibleFileRecord {
    if (!file) {
      throw new NotFoundException("File was not found.");
    }

    if (file.deletedAt || file.status === FileStatus.DELETED) {
      throw new BadRequestException("Deleted files cannot be ingested.");
    }

    if (!file.storageObject || file.storageObject.deletedAt) {
      throw new BadRequestException("File storage object was not found.");
    }

    if (file.source?.deletedAt) {
      throw new BadRequestException("File source was not found.");
    }

    try {
      this.parserService.ensureMimeTypeIsSupported(file.mimeType);
    } catch (error) {
      if (
        error instanceof IngestionError &&
        error.code === "UNSUPPORTED_MIME_TYPE"
      ) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  /**
   * Ensure a job has file ingestion scope.
   * @param job - Ingestion job record or response.
   */
  private ensureJobHasFileScope(
    job: FileScopedJob
  ): asserts job is FileScopedJob & RequiredFileScopedJob {
    if (!job.fileId || !job.sourceId || !job.knowledgeBaseId) {
      throw new BadRequestException("Only file ingestion jobs are supported.");
    }
  }
}
