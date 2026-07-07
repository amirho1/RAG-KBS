import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { metadataSchema } from "../../../common/dto/metadata.dto.js";
import { tenantFieldsSchema } from "../../../common/dto/tenant-query.dto.js";
import { retrievalMaxQueryLength } from "../retrieval.constants.js";
import { retrievalFilterSchema } from "./retrieval-filter.dto.js";

/**
 * Retrieval query request schema.
 */
export const retrievalQuerySchema = tenantFieldsSchema
  .extend({
    knowledgeBaseId: z.uuid(),
    query: z.string().trim().min(1).max(retrievalMaxQueryLength),
    topK: z.number().int().positive().optional(),
    scoreThreshold: z.number().finite().min(0).optional(),
    filters: retrievalFilterSchema.optional(),
    includeMetadata: z.boolean().optional(),
    includeText: z.boolean().optional(),
    metadata: metadataSchema.optional(),
  })
  .strict();

export type RetrievalQueryInput = z.infer<typeof retrievalQuerySchema>;

/**
 * Retrieval query request DTO.
 */
export class RetrievalQueryDto extends createZodDto(retrievalQuerySchema) {}
