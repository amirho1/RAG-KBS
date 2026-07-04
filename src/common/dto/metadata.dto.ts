import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export type MetadataJson =
  | string
  | number
  | boolean
  | null
  | MetadataJson[]
  | { [key: string]: MetadataJson };

/**
 * Validate JSON-compatible metadata values.
 */
export const metadataJsonSchema: z.ZodType<MetadataJson> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(metadataJsonSchema),
    z.record(z.string(), metadataJsonSchema),
  ])
);

/**
 * Validate metadata objects used by RAG resources.
 */
export const metadataSchema = z.record(z.string(), metadataJsonSchema);

/**
 * Shared metadata request DTO.
 */
export class MetadataDto extends createZodDto(metadataSchema) {}
