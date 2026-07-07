import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { paginationQuerySchema } from "../../../common/dto/pagination-query.dto.js";
import { createSortQuerySchema } from "../../../common/dto/sort-query.dto.js";
import { tenantFieldsSchema } from "../../../common/dto/tenant-query.dto.js";

const chunkStatusValues = [
  "ACTIVE",
  "SUPERSEDED",
  "NEEDS_EMBEDDING",
  "EMBEDDED",
  "FAILED",
  "DELETING",
  "DELETED",
] as const;

/**
 * List document chunks query schema.
 */
export const listDocumentChunksQuerySchema = tenantFieldsSchema
  .merge(paginationQuerySchema)
  .merge(createSortQuerySchema(["createdAt", "updatedAt", "chunkIndex"]))
  .extend({
    knowledgeBaseId: z.uuid().optional(),
    sourceId: z.uuid().optional(),
    fileId: z.uuid().optional(),
    parsedDocumentId: z.uuid().optional(),
    chunkingConfigId: z.uuid().optional(),
    status: z.enum(chunkStatusValues).optional(),
    contentHash: z.string().trim().length(64).optional(),
  })
  .strict();

/**
 * Tenant-scoped file chunks query schema.
 */
export const listFileChunksQuerySchema = listDocumentChunksQuerySchema.omit({
  fileId: true,
});

/**
 * File chunks route parameter schema.
 */
export const fileChunksParamSchema = z
  .object({
    fileId: z.uuid("fileId must be a valid UUID"),
  })
  .strict();

export type ListDocumentChunksQuery = z.infer<
  typeof listDocumentChunksQuerySchema
>;
export type ListFileChunksQuery = z.infer<typeof listFileChunksQuerySchema>;

/**
 * List document chunks query DTO.
 */
export class ListDocumentChunksQueryDto extends createZodDto(
  listDocumentChunksQuerySchema
) {}

/**
 * List file chunks query DTO.
 */
export class ListFileChunksQueryDto extends createZodDto(
  listFileChunksQuerySchema
) {}

/**
 * File chunks route parameter DTO.
 */
export class FileChunksParamDto extends createZodDto(fileChunksParamSchema) {}
