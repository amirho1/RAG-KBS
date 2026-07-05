import type { TagsService } from "../../tags.service.js";

/**
 * Soft-delete a tenant-scoped tag.
 * @param id - Tag ID.
 * @param tenantId - Tenant ID.
 */
export async function deleteTag(
  this: TagsService,
  id: string,
  tenantId: string
): Promise<void> {
  await this.ensureTagExists(id, tenantId);
  await this.prisma.tag.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });

  this.logger.info({
    event: "tag.deleted",
    tenantId,
    tagId: id,
  });
}
