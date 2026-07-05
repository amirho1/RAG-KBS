import { serializeJsonResponse } from "../../../../common/metadata/json-response.js";
import { normalizeTagName } from "../../../../common/metadata/name-normalization.js";
import { throwConflictForDuplicateRecord } from "../../../../common/metadata/prisma-errors.js";
import { toPrismaNullableJson } from "../../../../common/metadata/prisma-json.js";
import type { UpdateTagInput } from "../../dto/tags.dto.js";
import type { TagsService } from "../../tags.service.js";

/**
 * Update a tenant-scoped tag.
 * @param id - Tag ID.
 * @param tenantId - Tenant ID.
 * @param data - Update request data.
 * @returns The updated tag.
 */
export async function update(
  this: TagsService,
  id: string,
  tenantId: string,
  data: UpdateTagInput
): Promise<Record<string, unknown>> {
  await this.ensureTagExists(id, tenantId);
  const normalizedName = data.name ? normalizeTagName(data.name) : undefined;

  if (normalizedName) {
    await this.ensureTagNameIsAvailable(tenantId, normalizedName, id);
  }

  try {
    const tag = await this.prisma.tag.update({
      where: { id },
      data: {
        name: data.name,
        normalizedName,
        description: data.description,
        color: data.color,
        metadata: toPrismaNullableJson(data.metadata),
      },
    });

    this.logger.info({
      event: "tag.updated",
      tenantId,
      tagId: id,
    });

    return serializeJsonResponse(tag) as Record<string, unknown>;
  } catch (error) {
    throwConflictForDuplicateRecord(
      error,
      "A tag with the same normalized name already exists for this tenant."
    );
  }
}
