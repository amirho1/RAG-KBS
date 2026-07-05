/**
 * Safe storage object response shape.
 */
export class StorageObjectResponseDto {
  id!: string;
  tenantId!: string;
  provider!: string;
  bucket?: string | null;
  objectKey!: string;
  originalName?: string | null;
  mimeType?: string | null;
  extension?: string | null;
  sizeBytes!: string;
  checksumSha256!: string;
  etag?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date | null;
}

/**
 * Safe upload response shape.
 */
export class UploadFileResponseDto {
  storageObject!: StorageObjectResponseDto;
  file!: Record<string, unknown>;
}
