import { NotFoundException } from "@nestjs/common";
import type { TagsService } from "../../tags.service.js";

/**
 * Ensure a file tag assignment exists.
 * @param fileId - File ID.
 * @param tagId - Tag ID.
 */
export async function ensureFileTagIsAttached(
  this: TagsService,
  fileId: string,
  tagId: string
): Promise<void> {
  const existingAssignment = await this.prisma.fileTag.findUnique({
    where: {
      fileId_tagId: {
        fileId,
        tagId,
      },
    },
  });

  if (!existingAssignment) {
    throw new NotFoundException("Tag is not attached to this file.");
  }
}
