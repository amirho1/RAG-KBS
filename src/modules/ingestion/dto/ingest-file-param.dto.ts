import { createZodDto } from "nestjs-zod";
import { z } from "zod";

/**
 * File ingestion route parameter schema.
 */
export const ingestFileParamSchema = z
  .object({
    id: z.uuid("id must be a valid UUID"),
  })
  .strict();

export type IngestFileParam = z.infer<typeof ingestFileParamSchema>;

/**
 * File ingestion route parameter DTO.
 */
export class IngestFileParamDto extends createZodDto(ingestFileParamSchema) {}
