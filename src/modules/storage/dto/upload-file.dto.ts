import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { metadataSchema } from "../../../common/dto/metadata.dto.js";
import { tenantFieldsSchema } from "../../../common/dto/tenant-query.dto.js";

const optionalTextFieldSchema = z.string().trim().min(1).max(512).optional();

const optionalLongTextFieldSchema = z
  .string()
  .trim()
  .min(1)
  .max(10_000)
  .optional();

/**
 * Parse multipart metadata JSON before schema validation.
 * @param value - Raw metadata field value.
 * @returns Parsed metadata candidate.
 */
function parseMetadataField(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(trimmedValue) as unknown;
  } catch {
    return value;
  }
}

/**
 * Upload file request schema for multipart form fields.
 */
export const uploadFileSchema = tenantFieldsSchema
  .extend({
    sourceId: z.uuid(),
    knowledgeBaseId: z.uuid().optional(),
    title: optionalTextFieldSchema,
    description: optionalLongTextFieldSchema,
    metadata: z.preprocess(parseMetadataField, metadataSchema.optional()),
  })
  .strict();

export type UploadFileInput = z.infer<typeof uploadFileSchema>;

/**
 * Upload file multipart request DTO.
 */
export class UploadFileDto extends createZodDto(uploadFileSchema) {}
