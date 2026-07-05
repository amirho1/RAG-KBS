import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { metadataSchema } from "../../../common/dto/metadata.dto.js";
import { paginationQuerySchema } from "../../../common/dto/pagination-query.dto.js";
import { createSortQuerySchema } from "../../../common/dto/sort-query.dto.js";
import { tenantFieldsSchema } from "../../../common/dto/tenant-query.dto.js";

const nullableLongTextSchema = z
  .string()
  .trim()
  .max(10_000)
  .nullable()
  .optional();
const nullableMetadataSchema = metadataSchema.nullable().optional();

/**
 * Create tag request schema.
 */
export const createTagSchema = tenantFieldsSchema
  .extend({
    name: z.string().trim().min(1).max(128),
    description: z.string().trim().max(10_000).optional(),
    color: z.string().trim().min(1).max(32).optional(),
    metadata: metadataSchema.optional(),
  })
  .strict();

/**
 * Update tag request schema.
 */
export const updateTagSchema = z
  .object({
    name: z.string().trim().min(1).max(128).optional(),
    description: nullableLongTextSchema,
    color: z.string().trim().min(1).max(32).nullable().optional(),
    metadata: nullableMetadataSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

/**
 * List tags query schema.
 */
export const listTagsQuerySchema = tenantFieldsSchema
  .merge(paginationQuerySchema)
  .merge(createSortQuerySchema(["createdAt", "updatedAt", "name"]))
  .extend({
    search: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

/**
 * Source tag assignment params schema.
 */
export const sourceTagParamSchema = z
  .object({
    sourceId: z.uuid("sourceId must be a valid UUID"),
    tagId: z.uuid("tagId must be a valid UUID"),
  })
  .strict();

/**
 * File tag assignment params schema.
 */
export const fileTagParamSchema = z
  .object({
    fileId: z.uuid("fileId must be a valid UUID"),
    tagId: z.uuid("tagId must be a valid UUID"),
  })
  .strict();

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type ListTagsQuery = z.infer<typeof listTagsQuerySchema>;
export type SourceTagParam = z.infer<typeof sourceTagParamSchema>;
export type FileTagParam = z.infer<typeof fileTagParamSchema>;

/**
 * Create tag request DTO.
 */
export class CreateTagDto extends createZodDto(createTagSchema) {}

/**
 * Update tag request DTO.
 */
export class UpdateTagDto extends createZodDto(updateTagSchema) {}

/**
 * List tags query DTO.
 */
export class ListTagsQueryDto extends createZodDto(listTagsQuerySchema) {}

/**
 * Source tag assignment params DTO.
 */
export class SourceTagParamDto extends createZodDto(sourceTagParamSchema) {}

/**
 * File tag assignment params DTO.
 */
export class FileTagParamDto extends createZodDto(fileTagParamSchema) {}
