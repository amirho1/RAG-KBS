import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { tenantQuerySchema } from "../../../common/dto/tenant-query.dto.js";

/**
 * Retry ingestion job query schema.
 */
export const retryIngestionJobQuerySchema = tenantQuerySchema;

export type RetryIngestionJobQuery = z.infer<
  typeof retryIngestionJobQuerySchema
>;

/**
 * Retry ingestion job query DTO.
 */
export class RetryIngestionJobQueryDto extends createZodDto(
  retryIngestionJobQuerySchema
) {}
