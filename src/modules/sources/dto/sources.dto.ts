import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { checksumSha256Schema } from "../../../common/dto/file-field.dto.js";
import {
  createOptionalQueryListSchema,
  createOptionalUuidListSchema,
} from "../../../common/dto/filter-query.dto.js";
import { metadataSchema } from "../../../common/dto/metadata.dto.js";
import { paginationQuerySchema } from "../../../common/dto/pagination-query.dto.js";
import { createSortQuerySchema } from "../../../common/dto/sort-query.dto.js";
import { tenantFieldsSchema } from "../../../common/dto/tenant-query.dto.js";

const lifecycleStatusValues = [
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
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
const sourceTypeValues = [
  "UPLOAD",
  "URL",
  "WEB_PAGE",
  "SITEMAP",
  "API_DOCUMENTATION",
  "OPENAPI",
  "SWAGGER",
  "MARKDOWN",
  "TEXT",
  "POLICY",
  "MANUAL",
  "FAQ",
  "DATABASE_EXPORT",
  "CUSTOM",
] as const;
const sourceSyncModeValues = [
  "MANUAL",
  "SCHEDULED",
  "WEBHOOK",
  "API_PUSH",
] as const;

const optionalTextSchema = z.string().trim().min(1).max(255).optional();
const nullableLongTextSchema = z
  .string()
  .trim()
  .max(10_000)
  .nullable()
  .optional();
const nullableMetadataSchema = metadataSchema.nullable().optional();

/**
 * Create source request schema.
 */
export const createSourceSchema = tenantFieldsSchema
  .extend({
    knowledgeBaseId: z.uuid(),
    parentSourceId: z.uuid().optional(),
    externalId: z.string().trim().min(1).max(191).optional(),
    name: z.string().trim().min(1).max(255),
    slug: optionalTextSchema,
    description: z.string().trim().max(10_000).optional(),
    type: z.enum(sourceTypeValues),
    syncMode: z.enum(sourceSyncModeValues).optional(),
    status: z.enum(lifecycleStatusValues).optional(),
    processingState: z.enum(processingStateValues).optional(),
    uri: z.url().or(z.string().trim().min(1).max(10_000)).optional(),
    checksumSha256: checksumSha256Schema.optional(),
    contentHash: checksumSha256Schema.optional(),
    metadata: metadataSchema.optional(),
  })
  .strict();

/**
 * Update source request schema.
 */
export const updateSourceSchema = z
  .object({
    parentSourceId: z.uuid().nullable().optional(),
    externalId: z.string().trim().min(1).max(191).nullable().optional(),
    name: optionalTextSchema,
    slug: optionalTextSchema,
    description: nullableLongTextSchema,
    type: z.enum(sourceTypeValues).optional(),
    syncMode: z.enum(sourceSyncModeValues).optional(),
    status: z.enum(lifecycleStatusValues).optional(),
    processingState: z.enum(processingStateValues).optional(),
    uri: z.string().trim().min(1).max(10_000).nullable().optional(),
    checksumSha256: checksumSha256Schema.nullable().optional(),
    contentHash: checksumSha256Schema.nullable().optional(),
    metadata: nullableMetadataSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

/**
 * List sources query schema.
 */
export const listSourcesQuerySchema = tenantFieldsSchema
  .merge(paginationQuerySchema)
  .merge(createSortQuerySchema(["createdAt", "updatedAt", "name"]))
  .extend({
    knowledgeBaseId: z.uuid().optional(),
    search: z.string().trim().min(1).max(255).optional(),
    type: z.enum(sourceTypeValues).optional(),
    status: z.enum(lifecycleStatusValues).optional(),
    processingState: z.enum(processingStateValues).optional(),
    tagIds: createOptionalUuidListSchema(),
    tagNames: createOptionalQueryListSchema(z.string().trim().min(1).max(128)),
  })
  .strict();

export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;
export type ListSourcesQuery = z.infer<typeof listSourcesQuerySchema>;

/**
 * Create source request DTO.
 */
export class CreateSourceDto extends createZodDto(createSourceSchema) {}

/**
 * Update source request DTO.
 */
export class UpdateSourceDto extends createZodDto(updateSourceSchema) {}

/**
 * List sources query DTO.
 */
export class ListSourcesQueryDto extends createZodDto(listSourcesQuerySchema) {}
