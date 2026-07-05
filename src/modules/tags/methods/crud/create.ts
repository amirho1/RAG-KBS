import { serializeJsonResponse } from "../../../../common/metadata/json-response.js";
import { normalizeTagName } from "../../../../common/metadata/name-normalization.js";
import { throwConflictForDuplicateRecord } from "../../../../common/metadata/prisma-errors.js";
import { toPrismaNullableJson } from "../../../../common/metadata/prisma-json.js";
import type { CreateTagInput } from "../../dto/tags.dto.js";
import type { TagsService } from "../../tags.service.js";

/**
 * Create a tenant-scoped tag.
 * @param data - Create request data.
 * @returns The created tag.
 */
export async function create(
  this: TagsService,
  data: CreateTagInput
): Promise<Record<string, unknown>> {
  const normalizedName = normalizeTagName(data.name);
  await this.ensureTagNameIsAvailable(data.tenantId, normalizedName);

  try {
    const tag = await this.prisma.tag.create({
      data: {
        tenantId: data.tenantId,
        organizationId: data.organizationId,
        projectId: data.projectId,
        name: data.name,
        normalizedName,
        description: data.description,
        color: data.color,
        metadata: toPrismaNullableJson(data.metadata),
      },
    });

    this.logger.info({
      event: "tag.created",
      tenantId: tag.tenantId,
      tagId: tag.id,
    });

    return serializeJsonResponse(tag) as Record<string, unknown>;
  } catch (error) {
    throwConflictForDuplicateRecord(
      error,
      "A tag with the same normalized name already exists for this tenant."
    );
  }
}
