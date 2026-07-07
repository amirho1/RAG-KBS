import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { paginationQuerySchema } from "../../../common/dto/pagination-query.dto.js";
import { createSortQuerySchema } from "../../../common/dto/sort-query.dto.js";
import { tenantFieldsSchema } from "../../../common/dto/tenant-query.dto.js";

const ingestionJobTypeValues = ["INGEST_FILE", "REINGEST_FILE"] as const;
const ingestionJobStatusValues = [
  "PENDING",
  "QUEUED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "RETRYING",
  "CANCELLED",
  "SKIPPED",
] as const;

/**
 * List ingestion jobs query schema.
 */
export const listIngestionJobsQuerySchema = tenantFieldsSchema
  .merge(paginationQuerySchema)
  .merge(
    createSortQuerySchema([
      "createdAt",
      "updatedAt",
      "queuedAt",
      "startedAt",
      "finishedAt",
      "status",
    ])
  )
  .extend({
    fileId: z.uuid().optional(),
    sourceId: z.uuid().optional(),
    knowledgeBaseId: z.uuid().optional(),
    status: z.enum(ingestionJobStatusValues).optional(),
    type: z.enum(ingestionJobTypeValues).optional(),
    createdAtFrom: z.coerce.date().optional(),
    createdAtTo: z.coerce.date().optional(),
  })
  .strict();

export type ListIngestionJobsQuery = z.infer<
  typeof listIngestionJobsQuerySchema
>;

/**
 * List ingestion jobs query DTO.
 */
export class ListIngestionJobsQueryDto extends createZodDto(
  listIngestionJobsQuerySchema
) {}
