import { ConflictException } from "@nestjs/common";
import type { TagsService } from "../../tags.service.js";

/**
 * Ensure a file tag assignment is not already present.
 * @param fileId - File ID.
 * @param tagId - Tag ID.
 */
export async function ensureFileTagIsNotAttached(
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

  if (existingAssignment) {
    throw new ConflictException("Tag is already attached to this file.");
  }
}
