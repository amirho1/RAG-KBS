import type { Job } from "bullmq";
import { sanitizeError } from "./log-redaction.js";

export type JobLogStatus =
  "started" | "completed" | "failed" | "retrying" | "stalled" | "cancelled";

export type JobLogMetadata = {
  durationMs?: number;
};

type JobData = Record<string, unknown>;

const whitelistedJobDataKeys = [
  "tenantId",
  "knowledgeBaseId",
  "sourceId",
  "fileId",
  "ingestionJobId",
] as const;

/**
 * Build a safe structured BullMQ job log payload.
 * @param job - BullMQ job.
 * @param status - Lifecycle status.
 * @param metadata - Additional safe metadata.
 * @param error - Optional caught error.
 * @returns A safe job log payload.
 */
export function buildJobLogPayload(
  job: Pick<Job<JobData>, "id" | "name" | "data" | "attemptsMade" | "opts"> & {
    queueName?: string;
  },
  status: JobLogStatus,
  metadata: JobLogMetadata = {},
  error?: unknown
): Record<string, unknown> {
  return removeUndefinedValues({
    event: `job.${status}`,
    jobId: job.id,
    queueName: job.queueName,
    jobName: job.name,
    attempt: job.attemptsMade,
    maxAttempts: job.opts.attempts,
    status,
    durationMs: metadata.durationMs,
    ...extractSafeJobData(job.data),
    error: error ? sanitizeError(error) : undefined,
  });
}

/**
 * Extract only whitelisted job data fields for logs.
 * @param data - Job data.
 * @returns Safe job data fields.
 */
function extractSafeJobData(data: JobData): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of whitelistedJobDataKeys) {
    const value = data[key];

    if (typeof value === "string" && value.length > 0) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Remove undefined values from a payload.
 * @param value - Payload.
 * @returns Payload without undefined values.
 */
function removeUndefinedValues(
  value: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter((entry) => entry[1] !== undefined)
  );
}
