import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { metadataSchema } from "../../../common/dto/metadata.dto.js";
import { tenantFieldsSchema } from "../../../common/dto/tenant-query.dto.js";
import { defaultIngestionReason } from "../ingestion.constants.js";

/**
 * Create file ingestion job request schema.
 */
export const createIngestionJobSchema = tenantFieldsSchema
  .extend({
    force: z.boolean().default(false),
    reason: z.string().trim().min(1).max(128).default(defaultIngestionReason),
    metadata: metadataSchema.optional(),
  })
  .strict();

export type CreateIngestionJobInput = z.infer<typeof createIngestionJobSchema>;

/**
 * Create file ingestion job request DTO.
 */
export class CreateIngestionJobDto extends createZodDto(
  createIngestionJobSchema
) {}
