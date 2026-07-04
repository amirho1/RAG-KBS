import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { createSafeEnumSchema } from "./safe-enum.dto.js";

export const sortDirectionSchema = createSafeEnumSchema(["asc", "desc"]);

const defaultSortFields = ["createdAt", "updatedAt", "name"] as const;

/**
 * Create a strict sorting query schema for allowed fields.
 * @param allowedFields - Fields accepted by the route.
 * @returns A strict sort query schema.
 */
export function createSortQuerySchema<
  const Values extends readonly [string, ...string[]],
>(allowedFields: Values) {
  return z
    .object({
      sortBy: z.enum(allowedFields).optional(),
      sortDirection: sortDirectionSchema.default("asc"),
    })
    .strict();
}

/**
 * Shared default sorting query schema.
 */
export const sortQuerySchema = createSortQuerySchema(defaultSortFields);

export type SortQuery = z.infer<typeof sortQuerySchema>;

/**
 * Shared sorting query DTO.
 */
export class SortQueryDto extends createZodDto(sortQuerySchema) {}
