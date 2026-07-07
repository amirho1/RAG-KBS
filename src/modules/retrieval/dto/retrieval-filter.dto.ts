import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { mimeTypeSchema } from "../../../common/dto/file-field.dto.js";
import { retrievalMaxFilterValues } from "../retrieval.constants.js";

const retrievalTagSchema = z.string().trim().min(1).max(128);
const retrievalLanguageSchema = z.string().trim().min(2).max(32);
const retrievalUuidArraySchema = z
  .array(z.uuid())
  .min(1)
  .max(retrievalMaxFilterValues);
const retrievalTextArraySchema = z
  .array(retrievalTagSchema)
  .min(1)
  .max(retrievalMaxFilterValues);
const retrievalMimeTypeArraySchema = z
  .array(mimeTypeSchema)
  .min(1)
  .max(retrievalMaxFilterValues);

/**
 * Metadata filter schema accepted by retrieval requests.
 */
export const retrievalFilterSchema = z
  .object({
    sourceId: z.uuid().optional(),
    sourceIds: retrievalUuidArraySchema.optional(),
    fileId: z.uuid().optional(),
    fileIds: retrievalUuidArraySchema.optional(),
    tags: retrievalTextArraySchema.optional(),
    mimeType: mimeTypeSchema.optional(),
    mimeTypes: retrievalMimeTypeArraySchema.optional(),
    language: retrievalLanguageSchema.optional(),
  })
  .strict()
  .superRefine((data, context) => {
    addSingularPluralIssue(
      context,
      data.sourceId,
      data.sourceIds,
      "sourceId",
      "sourceIds"
    );
    addSingularPluralIssue(
      context,
      data.fileId,
      data.fileIds,
      "fileId",
      "fileIds"
    );
    addSingularPluralIssue(
      context,
      data.mimeType,
      data.mimeTypes,
      "mimeType",
      "mimeTypes"
    );
  });

export type RetrievalFilterDtoInput = z.infer<typeof retrievalFilterSchema>;

/**
 * Retrieval metadata filter DTO.
 */
export class RetrievalFilterDto extends createZodDto(retrievalFilterSchema) {}

/**
 * Add a validation issue when singular and plural filter forms are both used.
 * @param context - Zod refinement context.
 * @param singularValue - Singular filter value.
 * @param pluralValue - Plural filter values.
 * @param singularField - Singular field name.
 * @param pluralField - Plural field name.
 */
function addSingularPluralIssue(
  context: z.RefinementCtx,
  singularValue: unknown,
  pluralValue: unknown[] | undefined,
  singularField: string,
  pluralField: string
): void {
  if (singularValue === undefined || pluralValue === undefined) {
    return;
  }

  context.addIssue({
    code: "custom",
    message: `${singularField} and ${pluralField} cannot be used together`,
    path: [pluralField],
  });
}
