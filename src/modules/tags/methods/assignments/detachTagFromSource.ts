import type { TagsService } from "../../tags.service.js";

/**
 * Detach a tag from a source.
 * @param sourceId - Source ID.
 * @param tagId - Tag ID.
 * @param tenantId - Tenant ID.
 */
export async function detachTagFromSource(
  this: TagsService,
  sourceId: string,
  tagId: string,
  tenantId: string
): Promise<void> {
  await this.ensureSourceExists(sourceId, tenantId);
  await this.ensureTagExists(tagId, tenantId);
  await this.ensureSourceTagIsAttached(sourceId, tagId);

  await this.prisma.sourceTag.delete({
    where: {
      sourceId_tagId: {
        sourceId,
        tagId,
      },
    },
  });

  this.logger.info({
    event: "tag.detached",
    tenantId,
    sourceId,
    tagId,
    targetType: "source",
  });
}
