import type { TagsService } from "../../tags.service.js";

/**
 * Attach a tag to a source.
 * @param sourceId - Source ID.
 * @param tagId - Tag ID.
 * @param tenantId - Tenant ID.
 */
export async function attachTagToSource(
  this: TagsService,
  sourceId: string,
  tagId: string,
  tenantId: string
): Promise<void> {
  await this.ensureSourceExists(sourceId, tenantId);
  await this.ensureTagExists(tagId, tenantId);
  await this.ensureSourceTagIsNotAttached(sourceId, tagId);

  await this.prisma.sourceTag.create({
    data: {
      sourceId,
      tagId,
    },
  });

  this.logger.info({
    event: "tag.attached",
    tenantId,
    sourceId,
    tagId,
    targetType: "source",
  });
}
