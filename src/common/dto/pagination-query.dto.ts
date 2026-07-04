import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const defaultPage = 1;
const defaultLimit = 20;
const maxLimit = 100;

/**
 * Shared pagination query schema.
 */
export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(defaultPage),
    limit: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit),
  })
  .strict();

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/**
 * Shared pagination query DTO.
 */
export class PaginationQueryDto extends createZodDto(paginationQuerySchema) {}
