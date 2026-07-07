import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Safe summary for an ingestion attempt.
 */
export class IngestionAttemptSummaryDto {
  @ApiProperty({ example: "4e946c9e-ea1e-48d4-aa8e-7f3e4a29c41d" })
  id!: string;

  @ApiProperty({ example: 1 })
  attemptNumber!: number;

  @ApiProperty({ example: "COMPLETED" })
  status!: string;

  @ApiPropertyOptional({ example: "worker-host-1:12345" })
  workerId?: string | null;

  @ApiPropertyOptional({ example: "2026-07-04T00:00:00.000Z" })
  startedAt?: Date | null;

  @ApiPropertyOptional({ example: "2026-07-04T00:00:02.000Z" })
  finishedAt?: Date | null;

  @ApiPropertyOptional({ example: 2000 })
  durationMs?: number | null;

  @ApiPropertyOptional({ example: "UNSUPPORTED_MIME_TYPE" })
  errorCode?: string | null;

  @ApiPropertyOptional({
    example:
      "This file type is not supported by the current ingestion pipeline.",
  })
  errorMessage?: string | null;
}

/**
 * Safe ingestion job response DTO.
 */
export class IngestionJobResponseDto {
  @ApiProperty({ example: "4e946c9e-ea1e-48d4-aa8e-7f3e4a29c41d" })
  id!: string;

  @ApiProperty({ example: "tenant_acme" })
  tenantId!: string;

  @ApiProperty({ example: "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b" })
  knowledgeBaseId!: string;

  @ApiPropertyOptional({ example: "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4" })
  sourceId?: string | null;

  @ApiPropertyOptional({ example: "113d5fe3-927e-428d-9b55-557a6f776ed9" })
  fileId?: string | null;

  @ApiProperty({ example: "INGEST_FILE" })
  type!: string;

  @ApiProperty({ example: "QUEUED" })
  status!: string;

  @ApiProperty({ example: "ingestion" })
  queueName!: string;

  @ApiPropertyOptional({ example: "4e946c9e-ea1e-48d4-aa8e-7f3e4a29c41d" })
  bullJobId?: string | null;

  @ApiProperty({ example: 0 })
  attemptCount!: number;

  @ApiProperty({ example: 3 })
  maxAttempts!: number;

  @ApiProperty({ example: false })
  force!: boolean;

  @ApiPropertyOptional({ example: "INITIAL_INGESTION" })
  reason?: string | null;

  @ApiPropertyOptional({
    example: {
      requestedBy: "api-gateway",
    },
  })
  metadata?: Record<string, unknown> | null;

  @ApiPropertyOptional({ example: "UNSUPPORTED_MIME_TYPE" })
  errorCode?: string | null;

  @ApiPropertyOptional({
    example:
      "This file type is not supported by the current ingestion pipeline.",
  })
  errorMessage?: string | null;

  @ApiPropertyOptional({ type: IngestionAttemptSummaryDto })
  latestAttempt?: IngestionAttemptSummaryDto | null;

  @ApiProperty({ example: "2026-07-04T00:00:00.000Z" })
  createdAt!: Date;
}
