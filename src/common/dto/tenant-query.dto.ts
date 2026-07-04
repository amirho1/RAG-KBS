import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const tenantFieldMaxLength = 128;

/**
 * Tenant-aware fields accepted by trusted upstream callers.
 */
export const tenantFieldsSchema = z
  .object({
    tenantId: z.string().trim().min(1).max(tenantFieldMaxLength),
    organizationId: z
      .string()
      .trim()
      .min(1)
      .max(tenantFieldMaxLength)
      .optional(),
    projectId: z.string().trim().min(1).max(tenantFieldMaxLength).optional(),
  })
  .strict();

/**
 * Tenant-aware query schema.
 */
export const tenantQuerySchema = tenantFieldsSchema;

export type TenantQuery = z.infer<typeof tenantQuerySchema>;

/**
 * Shared tenant-aware query DTO.
 */
export class TenantQueryDto extends createZodDto(tenantQuerySchema) {}
