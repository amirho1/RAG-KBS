import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import {
  checksumSha256Schema,
  mimeTypeSchema,
  sizeBytesSchema,
} from "../../../common/dto/file-field.dto.js";
import {
  createOptionalQueryListSchema,
  createOptionalUuidListSchema,
} from "../../../common/dto/filter-query.dto.js";
import { metadataSchema } from "../../../common/dto/metadata.dto.js";
import { paginationQuerySchema } from "../../../common/dto/pagination-query.dto.js";
import { createSortQuerySchema } from "../../../common/dto/sort-query.dto.js";
import { tenantFieldsSchema } from "../../../common/dto/tenant-query.dto.js";

const documentFileTypeValues = [
  "PDF",
  "DOCX",
  "TXT",
  "MARKDOWN",
  "HTML",
  "CSV",
  "XLSX",
  "JSON",
  "XML",
  "IMAGE",
  "AUDIO",
  "VIDEO",
  "OPENAPI",
  "UNKNOWN",
] as const;
const fileStatusValues = [
  "UPLOADED",
  "STORED",
  "WAITING_FOR_INGESTION",
  "INGESTING",
  "INGESTED",
  "PARTIALLY_INGESTED",
  "FAILED",
  "NEEDS_REINGESTION",
  "NEEDS_REEMBEDDING",
  "DELETING",
  "DELETED",
] as const;
const processingStateValues = [
  "NOT_STARTED",
  "QUEUED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "RETRYING",
  "CANCELLED",
  "SKIPPED",
] as const;

const nullableLongTextSchema = z
  .string()
  .trim()
  .max(10_000)
  .nullable()
  .optional();
const nullableMetadataSchema = metadataSchema.nullable().optional();

/**
 * Create document file request schema.
 */
export const createFileSchema = tenantFieldsSchema
  .extend({
    sourceId: z.uuid(),
    storageObjectId: z.uuid(),
    previousFileId: z.uuid().optional(),
    externalId: z.string().trim().min(1).max(191).optional(),
    originalName: z.string().trim().min(1).max(512),
    normalizedName: z.string().trim().min(1).max(512).optional(),
    logicalPath: z.string().trim().min(1).max(10_000).optional(),
    mimeType: mimeTypeSchema,
    extension: z.string().trim().min(1).max(32).optional(),
    fileType: z.enum(documentFileTypeValues).optional(),
    sizeBytes: sizeBytesSchema,
    checksumSha256: checksumSha256Schema,
    contentHash: checksumSha256Schema.optional(),
    version: z.number().int().positive().optional(),
    status: z.enum(fileStatusValues).optional(),
    processingState: z.enum(processingStateValues).optional(),
    title: z.string().trim().min(1).max(512).optional(),
    description: z.string().trim().max(10_000).optional(),
    language: z.string().trim().min(2).max(32).optional(),
    metadata: metadataSchema.optional(),
  })
  .strict();

/**
 * Update document file request schema.
 */
export const updateFileSchema = z
  .object({
    storageObjectId: z.uuid().optional(),
    previousFileId: z.uuid().nullable().optional(),
    externalId: z.string().trim().min(1).max(191).nullable().optional(),
    originalName: z.string().trim().min(1).max(512).optional(),
    normalizedName: z.string().trim().min(1).max(512).nullable().optional(),
    logicalPath: z.string().trim().min(1).max(10_000).nullable().optional(),
    mimeType: mimeTypeSchema.optional(),
    extension: z.string().trim().min(1).max(32).nullable().optional(),
    fileType: z.enum(documentFileTypeValues).optional(),
    sizeBytes: sizeBytesSchema.optional(),
    checksumSha256: checksumSha256Schema.optional(),
    contentHash: checksumSha256Schema.nullable().optional(),
    version: z.number().int().positive().optional(),
    status: z.enum(fileStatusValues).optional(),
    processingState: z.enum(processingStateValues).optional(),
    title: z.string().trim().min(1).max(512).nullable().optional(),
    description: nullableLongTextSchema,
    language: z.string().trim().min(2).max(32).nullable().optional(),
    metadata: nullableMetadataSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

/**
 * List document files query schema.
 */
export const listFilesQuerySchema = tenantFieldsSchema
  .merge(paginationQuerySchema)
  .merge(
    createSortQuerySchema(["createdAt", "updatedAt", "originalName", "title"])
  )
  .extend({
    knowledgeBaseId: z.uuid().optional(),
    sourceId: z.uuid().optional(),
    storageObjectId: z.uuid().optional(),
    status: z.enum(fileStatusValues).optional(),
    processingState: z.enum(processingStateValues).optional(),
    fileType: z.enum(documentFileTypeValues).optional(),
    mimeType: mimeTypeSchema.optional(),
    checksumSha256: checksumSha256Schema.optional(),
    search: z.string().trim().min(1).max(255).optional(),
    tagIds: createOptionalUuidListSchema(),
    tagNames: createOptionalQueryListSchema(z.string().trim().min(1).max(128)),
  })
  .strict();

export type CreateFileInput = z.infer<typeof createFileSchema>;
export type UpdateFileInput = z.infer<typeof updateFileSchema>;
export type ListFilesQuery = z.infer<typeof listFilesQuerySchema>;

/**
 * Create document file request DTO.
 */
export class CreateFileDto extends createZodDto(createFileSchema) {}

/**
 * Update document file request DTO.
 */
export class UpdateFileDto extends createZodDto(updateFileSchema) {}

/**
 * List document files query DTO.
 */
export class ListFilesQueryDto extends createZodDto(listFilesQuerySchema) {}
