import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Safe document chunk response shape.
 */
export class DocumentChunkResponseDto {
  @ApiProperty({ example: "113d5fe3-927e-428d-9b55-557a6f776ed9" })
  id!: string;

  @ApiProperty({ example: "tenant_acme" })
  tenantId!: string;

  @ApiProperty({ example: 0 })
  chunkIndex!: number;

  @ApiProperty({ example: "Preview text only" })
  textPreview!: string;

  @ApiPropertyOptional({ example: 120 })
  tokenCount?: number | null;

  @ApiProperty({
    example: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  })
  contentHash!: string;

  @ApiProperty({ example: "EMBEDDED" })
  status!: string;
}

/**
 * Safe chunk embedding response shape.
 */
export class DocumentChunkEmbeddingResponseDto {
  @ApiProperty({ example: "113d5fe3-927e-428d-9b55-557a6f776ed9" })
  id!: string;

  @ApiProperty({ example: "113d5fe3-927e-428d-9b55-557a6f776ed9" })
  chunkId!: string;

  @ApiProperty({ example: "113d5fe3-927e-428d-9b55-557a6f776ed9" })
  qdrantPointId!: string;

  @ApiProperty({ example: 1536 })
  vectorDimension!: number;

  @ApiProperty({ example: "INDEXED" })
  status!: string;
}
