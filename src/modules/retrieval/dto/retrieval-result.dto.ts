import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * One retrieved chunk returned by the retrieval API.
 */
export class RetrievalResultDto {
  @ApiProperty({ example: 1 })
  rank!: number;

  @ApiProperty({ example: 0.82 })
  score!: number;

  @ApiProperty({ example: "113d5fe3-927e-428d-9b55-557a6f776ed9" })
  chunkId!: string;

  @ApiProperty({ example: "adf1ed11-f72e-4af4-9a1b-9d6d9941d30e" })
  sourceId!: string;

  @ApiProperty({ example: "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4" })
  fileId!: string;

  @ApiPropertyOptional({
    example: "To upload a document, send a multipart request...",
  })
  text?: string;

  @ApiProperty({
    example: "To upload a document, send a multipart request...",
  })
  textPreview!: string;

  @ApiPropertyOptional({
    example: {
      title: "Upload Guide",
      tags: ["api-docs"],
      mimeType: "text/markdown",
      chunkIndex: 4,
      headingPath: ["Files", "Upload"],
    },
  })
  metadata?: Record<string, unknown>;
}

/**
 * Retrieval query response DTO.
 */
export class RetrievalQueryResponseDto {
  @ApiProperty({ example: "113d5fe3-927e-428d-9b55-557a6f776ed9" })
  queryId!: string;

  @ApiProperty({ example: "tenant_acme" })
  tenantId!: string;

  @ApiProperty({ example: "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4" })
  knowledgeBaseId!: string;

  @ApiProperty({ example: "How do I upload documents?" })
  query!: string;

  @ApiProperty({ example: 8 })
  topK!: number;

  @ApiProperty({ example: 3 })
  resultCount!: number;

  @ApiProperty({ type: [RetrievalResultDto] })
  results!: RetrievalResultDto[];

  @ApiProperty({ example: 42 })
  latencyMs!: number;

  @ApiProperty({ example: "2026-07-04T00:00:00.000Z" })
  createdAt!: string;
}

/**
 * Retrieval query debug response DTO.
 */
export class RetrievalQueryDebugResponseDto {
  @ApiProperty({ example: "113d5fe3-927e-428d-9b55-557a6f776ed9" })
  id!: string;

  @ApiProperty({ example: "tenant_acme" })
  tenantId!: string;

  @ApiProperty({ example: "SUCCESS" })
  status!: string;

  @ApiProperty({ example: 3 })
  resultCount!: number;

  @ApiProperty({ example: 42 })
  latencyMs!: number | null;

  @ApiProperty({ type: [RetrievalResultDto] })
  results!: RetrievalResultDto[];
}
