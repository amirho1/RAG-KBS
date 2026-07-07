import type {
  IngestionJobType,
  JobStatus,
} from "../../generated/prisma/enums.js";

export type IngestionErrorCode =
  | "FILE_NOT_FOUND"
  | "FILE_DELETED"
  | "STORAGE_OBJECT_NOT_FOUND"
  | "STORAGE_READ_FAILED"
  | "UNSUPPORTED_MIME_TYPE"
  | "PARSER_NOT_FOUND"
  | "PARSER_FAILED"
  | "EMPTY_DOCUMENT"
  | "CONTENT_TOO_LARGE"
  | "DATABASE_ERROR"
  | "QUEUE_ERROR"
  | "JOB_CANCELLED"
  | "UNKNOWN_INGESTION_ERROR";

export type IngestionQueuePayload = {
  ingestionJobId: string;
  tenantId: string;
  fileId: string;
  sourceId: string;
  knowledgeBaseId: string;
  force: boolean;
};

export type IngestionJobIdentity = {
  id: string;
  tenantId: string;
  knowledgeBaseId: string;
  sourceId: string | null;
  fileId: string | null;
  type: IngestionJobType;
  status: JobStatus;
  force: boolean;
  maxAttempts: number;
  attemptCount: number;
};

export type SafeIngestionError = {
  code: IngestionErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
};

/**
 * Error used to carry safe ingestion failure metadata.
 */
export class IngestionError extends Error {
  code: IngestionErrorCode;
  retryable: boolean;
  details?: Record<string, unknown>;

  /**
   * Create an ingestion error.
   * @param input - Safe error metadata.
   */
  constructor(input: SafeIngestionError) {
    super(input.message);
    this.name = "IngestionError";
    this.code = input.code;
    this.retryable = input.retryable;
    this.details = input.details;
  }
}

/**
 * Convert unknown errors into safe ingestion errors.
 * @param error - Caught error value.
 * @returns Safe ingestion error.
 */
export function toIngestionError(error: unknown): IngestionError {
  if (error instanceof IngestionError) {
    return error;
  }

  if (isPrismaError(error)) {
    return new IngestionError({
      code: "DATABASE_ERROR",
      message: "The ingestion job could not update database state.",
      retryable: true,
    });
  }

  return new IngestionError({
    code: "UNKNOWN_INGESTION_ERROR",
    message: "The ingestion job failed unexpectedly.",
    retryable: true,
  });
}

/**
 * Check whether an error looks like a Prisma database error.
 * @param error - Caught error value.
 * @returns True when the error came from Prisma.
 */
function isPrismaError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = (error as Error & { code?: unknown }).code;

  return (
    error.name.startsWith("Prisma") ||
    (typeof code === "string" && /^P\d{4}$/.test(code))
  );
}

/**
 * Create a safe non-retryable ingestion error.
 * @param code - Safe error code.
 * @param message - Safe message.
 * @param details - Optional safe metadata.
 * @returns Ingestion error.
 */
export function createNonRetryableIngestionError(
  code: IngestionErrorCode,
  message: string,
  details?: Record<string, unknown>
): IngestionError {
  return new IngestionError({
    code,
    message,
    retryable: false,
    details,
  });
}

/**
 * Create a safe retryable ingestion error.
 * @param code - Safe error code.
 * @param message - Safe message.
 * @param details - Optional safe metadata.
 * @returns Ingestion error.
 */
export function createRetryableIngestionError(
  code: IngestionErrorCode,
  message: string,
  details?: Record<string, unknown>
): IngestionError {
  return new IngestionError({
    code,
    message,
    retryable: true,
    details,
  });
}
