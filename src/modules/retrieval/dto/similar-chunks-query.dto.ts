import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { metadataSchema } from "../../../common/dto/metadata.dto.js";
import { tenantFieldsSchema } from "../../../common/dto/tenant-query.dto.js";
import { retrievalFilterSchema } from "./retrieval-filter.dto.js";

/**
 * Future similar-chunks query schema.
 */
export const similarChunksQuerySchema = tenantFieldsSchema
  .extend({
    knowledgeBaseId: z.uuid(),
    chunkId: z.uuid(),
    topK: z.number().int().positive().optional(),
    scoreThreshold: z.number().finite().min(0).optional(),
    filters: retrievalFilterSchema.optional(),
    includeMetadata: z.boolean().optional(),
    includeText: z.boolean().optional(),
    metadata: metadataSchema.optional(),
  })
  .strict();

export type SimilarChunksQueryInput = z.infer<typeof similarChunksQuerySchema>;

/**
 * Future similar-chunks query DTO.
 */
export class SimilarChunksQueryDto extends createZodDto(
  similarChunksQuerySchema
) {}
