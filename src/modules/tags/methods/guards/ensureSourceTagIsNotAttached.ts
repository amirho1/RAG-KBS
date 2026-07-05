import { ConflictException } from "@nestjs/common";
import type { TagsService } from "../../tags.service.js";

/**
 * Ensure a source tag assignment is not already present.
 * @param sourceId - Source ID.
 * @param tagId - Tag ID.
 */
export async function ensureSourceTagIsNotAttached(
  this: TagsService,
  sourceId: string,
  tagId: string
): Promise<void> {
  const existingAssignment = await this.prisma.sourceTag.findUnique({
    where: {
      sourceId_tagId: {
        sourceId,
        tagId,
      },
    },
  });

  if (existingAssignment) {
    throw new ConflictException("Tag is already attached to this source.");
  }
}
