import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import {
  checksumSha256Schema,
  mimeTypeSchema,
  sizeBytesSchema,
} from "../../../common/dto/file-field.dto.js";
import { metadataSchema } from "../../../common/dto/metadata.dto.js";
import { paginationQuerySchema } from "../../../common/dto/pagination-query.dto.js";
import { createSortQuerySchema } from "../../../common/dto/sort-query.dto.js";
import { tenantFieldsSchema } from "../../../common/dto/tenant-query.dto.js";

const storageProviderValues = [
  "LOCAL",
  "S3",
  "MINIO",
  "GCS",
  "AZURE_BLOB",
  "CUSTOM",
] as const;

const nullableTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .nullable()
  .optional();
const nullableMetadataSchema = metadataSchema.nullable().optional();

/**
 * Create storage object request schema.
 */
export const createStorageObjectSchema = tenantFieldsSchema
  .extend({
    provider: z.enum(storageProviderValues),
    bucket: z.string().trim().min(1).max(255).optional(),
    objectKey: z.string().trim().min(1).max(10_000),
    region: z.string().trim().min(1).max(128).optional(),
    endpoint: z.url().or(z.string().trim().min(1).max(10_000)).optional(),
    versionId: z.string().trim().min(1).max(255).optional(),
    originalName: z.string().trim().min(1).max(512).optional(),
    mimeType: mimeTypeSchema.optional(),
    extension: z.string().trim().min(1).max(32).optional(),
    sizeBytes: sizeBytesSchema,
    checksumSha256: checksumSha256Schema,
    etag: z.string().trim().min(1).max(255).optional(),
    metadata: metadataSchema.optional(),
  })
  .strict();

/**
 * Update storage object request schema.
 */
export const updateStorageObjectSchema = z
  .object({
    provider: z.enum(storageProviderValues).optional(),
    bucket: nullableTextSchema,
    objectKey: z.string().trim().min(1).max(10_000).optional(),
    region: z.string().trim().min(1).max(128).nullable().optional(),
    endpoint: z.string().trim().min(1).max(10_000).nullable().optional(),
    versionId: nullableTextSchema,
    originalName: z.string().trim().min(1).max(512).nullable().optional(),
    mimeType: mimeTypeSchema.nullable().optional(),
    extension: z.string().trim().min(1).max(32).nullable().optional(),
    sizeBytes: sizeBytesSchema.optional(),
    checksumSha256: checksumSha256Schema.optional(),
    etag: nullableTextSchema,
    metadata: nullableMetadataSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

/**
 * List storage objects query schema.
 */
export const listStorageObjectsQuerySchema = tenantFieldsSchema
  .merge(paginationQuerySchema)
  .merge(createSortQuerySchema(["createdAt", "updatedAt", "originalName"]))
  .extend({
    provider: z.enum(storageProviderValues).optional(),
    checksumSha256: checksumSha256Schema.optional(),
    mimeType: mimeTypeSchema.optional(),
    search: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

export type CreateStorageObjectInput = z.infer<
  typeof createStorageObjectSchema
>;
export type UpdateStorageObjectInput = z.infer<
  typeof updateStorageObjectSchema
>;
export type ListStorageObjectsQuery = z.infer<
  typeof listStorageObjectsQuerySchema
>;

/**
 * Create storage object request DTO.
 */
export class CreateStorageObjectDto extends createZodDto(
  createStorageObjectSchema
) {}

/**
 * Update storage object request DTO.
 */
export class UpdateStorageObjectDto extends createZodDto(
  updateStorageObjectSchema
) {}

/**
 * List storage objects query DTO.
 */
export class ListStorageObjectsQueryDto extends createZodDto(
  listStorageObjectsQuerySchema
) {}
