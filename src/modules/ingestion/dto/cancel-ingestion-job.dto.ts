import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { tenantQuerySchema } from "../../../common/dto/tenant-query.dto.js";

/**
 * Cancel ingestion job query schema.
 */
export const cancelIngestionJobQuerySchema = tenantQuerySchema;

export type CancelIngestionJobQuery = z.infer<
  typeof cancelIngestionJobQuerySchema
>;

/**
 * Cancel ingestion job query DTO.
 */
export class CancelIngestionJobQueryDto extends createZodDto(
  cancelIngestionJobQuerySchema
) {}
