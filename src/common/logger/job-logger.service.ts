import { Injectable } from "@nestjs/common";
import type { Job } from "bullmq";
import { buildJobLogPayload, type JobLogMetadata } from "./job-log-payload.js";
import { PinoLoggerService } from "./pino-logger.service.js";

type JobData = Record<string, unknown>;

/**
 * Logs BullMQ ingestion job lifecycle events with safe metadata only.
 */
@Injectable()
export class JobLoggerService {
  constructor(private readonly logger: PinoLoggerService) {}

  /**
   * Log that a job started.
   * @param job - BullMQ job.
   */
  logStarted(job: Job<JobData>): Promise<void> {
    this.logger.info(buildJobLogPayload(job, "started"), "BullMQ job started");

    return Promise.resolve();
  }

  /**
   * Log that a job completed.
   * @param job - BullMQ job.
   * @param metadata - Safe lifecycle metadata.
   */
  logCompleted(
    job: Job<JobData>,
    metadata: JobLogMetadata = {}
  ): Promise<void> {
    this.logger.info(
      buildJobLogPayload(job, "completed", metadata),
      "BullMQ job completed"
    );

    return Promise.resolve();
  }

  /**
   * Log that a job failed.
   * @param job - BullMQ job.
   * @param error - Caught error.
   * @param metadata - Safe lifecycle metadata.
   */
  logFailed(
    job: Job<JobData>,
    error: unknown,
    metadata: JobLogMetadata = {}
  ): Promise<void> {
    this.logger.errorPayload(
      buildJobLogPayload(job, "failed", metadata, error),
      "BullMQ job failed"
    );

    return Promise.resolve();
  }

  /**
   * Log that a job is retrying.
   * @param job - BullMQ job.
   * @param error - Caught error.
   * @param metadata - Safe lifecycle metadata.
   */
  logRetrying(
    job: Job<JobData>,
    error: unknown,
    metadata: JobLogMetadata = {}
  ): Promise<void> {
    this.logger.warnPayload(
      buildJobLogPayload(job, "retrying", metadata, error),
      "BullMQ job retrying"
    );

    return Promise.resolve();
  }

  /**
   * Log that a job stalled.
   * @param job - BullMQ job.
   * @param metadata - Safe lifecycle metadata.
   */
  logStalled(job: Job<JobData>, metadata: JobLogMetadata = {}): Promise<void> {
    this.logger.warnPayload(
      buildJobLogPayload(job, "stalled", metadata),
      "BullMQ job stalled"
    );

    return Promise.resolve();
  }

  /**
   * Log that a job was cancelled.
   * @param job - BullMQ job.
   * @param metadata - Safe lifecycle metadata.
   */
  logCancelled(
    job: Job<JobData>,
    metadata: JobLogMetadata = {}
  ): Promise<void> {
    this.logger.warnPayload(
      buildJobLogPayload(job, "cancelled", metadata),
      "BullMQ job cancelled"
    );

    return Promise.resolve();
  }
}
