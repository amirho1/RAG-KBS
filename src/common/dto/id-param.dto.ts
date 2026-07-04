import { createZodDto } from "nestjs-zod";
import { z } from "zod";

/**
 * Shared UUID route parameter schema.
 */
export const idParamSchema = z
  .object({
    id: z.uuid("id must be a valid UUID"),
  })
  .strict();

export type IdParam = z.infer<typeof idParamSchema>;

/**
 * Shared UUID route parameter DTO.
 */
export class IdParamDto extends createZodDto(idParamSchema) {}
