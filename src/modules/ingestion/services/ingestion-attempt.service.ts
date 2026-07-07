import { Injectable } from "@nestjs/common";
import {
  AttemptStatus,
  FileStatus,
  JobStatus,
  ProcessingState,
} from "../../../generated/prisma/enums.js";
import type { MetadataJson } from "../../../common/dto/metadata.dto.js";
import { toPrismaNullableJson } from "../../../common/metadata/prisma-json.js";
import { PrismaService } from "../../database/prisma.service.js";
import type { IngestionError } from "../ingestion.types.js";

type AttemptJobRecord = {
  id: string;
  tenantId: string;
  organizationId?: string | null;
  projectId?: string | null;
  sourceId?: string | null;
  fileId?: string | null;
  startedAt?: Date | null;
  attemptCount: number;
};

type AttemptRecord = {
  id: string;
  startedAt: Date;
};

/**
 * Manages ingestion attempt records.
 */
@Injectable()
export class IngestionAttemptService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Start an ingestion attempt and move related records to processing.
   * @param job - Ingestion job record.
   * @param workerId - Worker instance ID.
   * @param hostname - Worker host name.
   * @returns Created attempt.
   */
  async startAttempt(
    job: AttemptJobRecord,
    workerId: string,
    hostname: string
  ) {
    const attemptNumber = job.attemptCount + 1;
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.ingestionJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.PROCESSING,
          startedAt: job.startedAt ?? now,
          attemptCount: {
            increment: 1,
          },
        },
      });

      if (job.fileId) {
        await tx.documentFile.update({
          where: { id: job.fileId },
          data: {
            status: FileStatus.INGESTING,
            processingState: ProcessingState.PROCESSING,
          },
        });
      }

      if (job.sourceId) {
        await tx.source.update({
          where: { id: job.sourceId },
          data: {
            processingState: ProcessingState.PROCESSING,
          },
        });
      }

      return tx.ingestionAttempt.create({
        data: {
          tenantId: job.tenantId,
          organizationId: job.organizationId,
          projectId: job.projectId,
          ingestionJobId: job.id,
          attemptNumber,
          status: AttemptStatus.STARTED,
          workerId,
          hostname,
          startedAt: now,
        },
      });
    });
  }

  /**
   * Record that a cancelled job reached the worker before processing.
   * @param job - Ingestion job record.
   * @param workerId - Worker instance ID.
   * @param hostname - Worker host name.
   */
  async recordCancelledAttempt(
    job: AttemptJobRecord,
    workerId: string,
    hostname: string
  ): Promise<void> {
    const startedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.ingestionJob.update({
        where: { id: job.id },
        data: {
          attemptCount: {
            increment: 1,
          },
        },
      });

      await tx.ingestionAttempt.create({
        data: {
          tenantId: job.tenantId,
          organizationId: job.organizationId,
          projectId: job.projectId,
          ingestionJobId: job.id,
          attemptNumber: job.attemptCount + 1,
          status: AttemptStatus.CANCELLED,
          workerId,
          hostname,
          startedAt,
          finishedAt: startedAt,
          durationMs: 0,
          errorCode: "JOB_CANCELLED",
          errorMessage: "The ingestion job was cancelled before processing.",
        },
      });
    });
  }

  /**
   * Mark an attempt as completed.
   * @param attempt - Attempt record.
   * @param metrics - Optional safe metrics.
   */
  async completeAttempt(
    attempt: AttemptRecord,
    metrics: Record<string, unknown> = {}
  ): Promise<void> {
    const finishedAt = new Date();

    await this.prisma.ingestionAttempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.COMPLETED,
        finishedAt,
        durationMs: calculateDurationMs(attempt.startedAt, finishedAt),
        metrics: toPrismaNullableJson(metrics as Record<string, MetadataJson>),
      },
    });
  }

  /**
   * Mark an attempt as failed or retrying.
   * @param attempt - Attempt record.
   * @param error - Safe ingestion error.
   * @param retrying - Whether BullMQ will retry the job.
   */
  async failAttempt(
    attempt: AttemptRecord,
    error: IngestionError,
    retrying: boolean
  ): Promise<void> {
    const finishedAt = new Date();

    await this.prisma.ingestionAttempt.update({
      where: { id: attempt.id },
      data: {
        status: retrying ? AttemptStatus.RETRYING : AttemptStatus.FAILED,
        finishedAt,
        durationMs: calculateDurationMs(attempt.startedAt, finishedAt),
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: toPrismaNullableJson(
          (error.details ?? null) as Record<string, MetadataJson> | null
        ),
      },
    });
  }

  /**
   * Mark an attempt as cancelled.
   * @param attempt - Attempt record.
   */
  async cancelAttempt(attempt: AttemptRecord): Promise<void> {
    const finishedAt = new Date();

    await this.prisma.ingestionAttempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.CANCELLED,
        finishedAt,
        durationMs: calculateDurationMs(attempt.startedAt, finishedAt),
        errorCode: "JOB_CANCELLED",
        errorMessage: "The ingestion job was cancelled before processing.",
      },
    });
  }
}

/**
 * Calculate attempt duration in milliseconds.
 * @param startedAt - Attempt start time.
 * @param finishedAt - Attempt finish time.
 * @returns Duration in milliseconds.
 */
function calculateDurationMs(startedAt: Date, finishedAt: Date): number {
  return Math.max(0, finishedAt.getTime() - startedAt.getTime());
}
