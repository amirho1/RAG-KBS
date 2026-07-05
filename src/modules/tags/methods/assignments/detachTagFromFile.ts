import type { TagsService } from "../../tags.service.js";

/**
 * Detach a tag from a file.
 * @param fileId - File ID.
 * @param tagId - Tag ID.
 * @param tenantId - Tenant ID.
 */
export async function detachTagFromFile(
  this: TagsService,
  fileId: string,
  tagId: string,
  tenantId: string
): Promise<void> {
  await this.ensureFileExists(fileId, tenantId);
  await this.ensureTagExists(tagId, tenantId);
  await this.ensureFileTagIsAttached(fileId, tagId);

  await this.prisma.fileTag.delete({
    where: {
      fileId_tagId: {
        fileId,
        tagId,
      },
    },
  });

  this.logger.info({
    event: "tag.detached",
    tenantId,
    fileId,
    tagId,
    targetType: "file",
  });
}
