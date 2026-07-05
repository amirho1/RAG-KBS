import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { metadataSchema } from "../../../common/dto/metadata.dto.js";
import { paginationQuerySchema } from "../../../common/dto/pagination-query.dto.js";
import { createSortQuerySchema } from "../../../common/dto/sort-query.dto.js";
import { tenantFieldsSchema } from "../../../common/dto/tenant-query.dto.js";

const knowledgeBaseStatusValues = [
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
  "DELETING",
  "DELETED",
] as const;

const optionalTextSchema = z.string().trim().min(1).max(255).optional();
const optionalLongTextSchema = z
  .string()
  .trim()
  .max(10_000)
  .nullable()
  .optional();
const optionalMetadataSchema = metadataSchema.optional();
const nullableMetadataSchema = metadataSchema.nullable().optional();

/**
 * Create knowledge base request schema.
 */
export const createKnowledgeBaseSchema = tenantFieldsSchema
  .extend({
    externalId: z.string().trim().min(1).max(191).optional(),
    name: z.string().trim().min(1).max(255),
    slug: optionalTextSchema,
    description: z.string().trim().max(10_000).optional(),
    status: z.enum(knowledgeBaseStatusValues).optional(),
    metadata: optionalMetadataSchema,
  })
  .strict();

/**
 * Update knowledge base request schema.
 */
export const updateKnowledgeBaseSchema = z
  .object({
    externalId: z.string().trim().min(1).max(191).nullable().optional(),
    name: optionalTextSchema,
    slug: optionalTextSchema,
    description: optionalLongTextSchema,
    status: z.enum(knowledgeBaseStatusValues).optional(),
    metadata: nullableMetadataSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

/**
 * List knowledge bases query schema.
 */
export const listKnowledgeBasesQuerySchema = tenantFieldsSchema
  .merge(paginationQuerySchema)
  .merge(createSortQuerySchema(["createdAt", "updatedAt", "name"]))
  .extend({
    search: z.string().trim().min(1).max(255).optional(),
    status: z.enum(knowledgeBaseStatusValues).optional(),
  })
  .strict();

export type CreateKnowledgeBaseInput = z.infer<
  typeof createKnowledgeBaseSchema
>;
export type UpdateKnowledgeBaseInput = z.infer<
  typeof updateKnowledgeBaseSchema
>;
export type ListKnowledgeBasesQuery = z.infer<
  typeof listKnowledgeBasesQuerySchema
>;

/**
 * Create knowledge base request DTO.
 */
export class CreateKnowledgeBaseDto extends createZodDto(
  createKnowledgeBaseSchema
) {}

/**
 * Update knowledge base request DTO.
 */
export class UpdateKnowledgeBaseDto extends createZodDto(
  updateKnowledgeBaseSchema
) {}

/**
 * List knowledge bases query DTO.
 */
export class ListKnowledgeBasesQueryDto extends createZodDto(
  listKnowledgeBasesQuerySchema
) {}
