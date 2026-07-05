import type { TagsService } from "../../tags.service.js";

/**
 * Attach a tag to a file.
 * @param fileId - File ID.
 * @param tagId - Tag ID.
 * @param tenantId - Tenant ID.
 */
export async function attachTagToFile(
  this: TagsService,
  fileId: string,
  tagId: string,
  tenantId: string
): Promise<void> {
  await this.ensureFileExists(fileId, tenantId);
  await this.ensureTagExists(tagId, tenantId);
  await this.ensureFileTagIsNotAttached(fileId, tagId);

  await this.prisma.fileTag.create({
    data: {
      fileId,
      tagId,
    },
  });

  this.logger.info({
    event: "tag.attached",
    tenantId,
    fileId,
    tagId,
    targetType: "file",
  });
}
