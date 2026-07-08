import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Safe storage object response shape.
 */
export class StorageObjectResponseDto {
  @ApiProperty({
    description: "Storage object UUID.",
    example: "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b",
    format: "uuid",
  })
  id!: string;

  @ApiProperty({
    description: "Trusted tenant boundary for the stored object.",
    example: "tenant_acme",
  })
  tenantId!: string;

  @ApiProperty({
    description: "Object storage provider used for the physical bytes.",
    example: "S3",
  })
  provider!: string;

  @ApiPropertyOptional({
    description: "Object storage bucket name when the provider uses buckets.",
    example: "rag-documents",
    nullable: true,
  })
  bucket?: string | null;

  @ApiProperty({
    description: "Provider-specific object key or path.",
    example: "tenants/tenant_acme/sources/openapi.yaml",
  })
  objectKey!: string;

  @ApiPropertyOptional({
    description: "Original filename supplied during upload.",
    example: "manual.txt",
    nullable: true,
  })
  originalName?: string | null;

  @ApiPropertyOptional({
    description: "Normalized MIME type of the uploaded file.",
    example: "text/plain",
    nullable: true,
  })
  mimeType?: string | null;

  @ApiPropertyOptional({
    description: "Safe file extension without a leading dot.",
    example: "txt",
    nullable: true,
  })
  extension?: string | null;

  @ApiProperty({
    description: "Stored object size in bytes serialized as a string.",
    example: "2048",
  })
  sizeBytes!: string;

  @ApiProperty({
    description: "SHA-256 checksum of the stored bytes.",
    example: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  })
  checksumSha256!: string;

  @ApiPropertyOptional({
    description: "Provider-specific entity tag when available.",
    example: '"2cf24dba5fb0a30e"',
    nullable: true,
  })
  etag?: string | null;

  @ApiProperty({
    description: "ISO 8601 timestamp when the storage object was created.",
    example: "2026-07-04T00:00:00.000Z",
    format: "date-time",
  })
  createdAt!: Date;

  @ApiProperty({
    description: "ISO 8601 timestamp when the storage object was last updated.",
    example: "2026-07-04T00:00:00.000Z",
    format: "date-time",
  })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description:
      "ISO 8601 timestamp when the storage object was soft-deleted, or null when active.",
    example: null,
    format: "date-time",
    nullable: true,
  })
  deletedAt?: Date | null;
}

/**
 * Safe upload response shape.
 */
export class UploadFileResponseDto {
  @ApiProperty({
    description: "Physical storage object metadata created or reused.",
    type: StorageObjectResponseDto,
  })
  storageObject!: StorageObjectResponseDto;

  @ApiProperty({
    description: "Logical document file metadata created for the source.",
    example: {
      id: "113d5fe3-927e-428d-9b55-557a6f776ed9",
      tenantId: "tenant_acme",
      sourceId: "adf1ed11-f72e-4af4-9a1b-9d6d9941d30e",
      storageObjectId: "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b",
      originalName: "manual.txt",
      mimeType: "text/plain",
      sizeBytes: "2048",
      checksumSha256:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      status: "STORED",
      processingState: "NOT_STARTED",
    },
  })
  file!: Record<string, unknown>;
}
