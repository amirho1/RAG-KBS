import { JobStatus, IngestionJobType } from "../../generated/prisma/enums.js";

export const ingestionBullJobName = "ingest-file";

export const textParserName = "text";
export const textParserVersion = "1.0.0";
export const markdownParserName = "markdown";
export const markdownParserVersion = "1.0.0";

export const supportedTextMimeTypes = ["text/plain"] as const;
export const supportedMarkdownMimeTypes = [
  "text/markdown",
  "text/x-markdown",
] as const;

export const supportedIngestionMimeTypes = [
  ...supportedTextMimeTypes,
  ...supportedMarkdownMimeTypes,
] as const;

export const activeIngestionJobStatuses = [
  JobStatus.PENDING,
  JobStatus.QUEUED,
  JobStatus.PROCESSING,
  JobStatus.RETRYING,
] as const;

export const reusableIngestionJobStatuses = [
  JobStatus.COMPLETED,
  JobStatus.SKIPPED,
] as const;

export const retryableIngestionJobStatuses = [
  JobStatus.FAILED,
  JobStatus.CANCELLED,
] as const;

export const cancellableIngestionJobStatuses = [
  JobStatus.PENDING,
  JobStatus.QUEUED,
] as const;

export const fileIngestionJobTypes = [
  IngestionJobType.INGEST_FILE,
  IngestionJobType.REINGEST_FILE,
] as const;

export const defaultIngestionReason = "INITIAL_INGESTION";
