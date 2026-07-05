import { NotFoundException } from "@nestjs/common";
import type { TagsService } from "../../tags.service.js";

/**
 * Ensure a source tag assignment exists.
 * @param sourceId - Source ID.
 * @param tagId - Tag ID.
 */
export async function ensureSourceTagIsAttached(
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

  if (!existingAssignment) {
    throw new NotFoundException("Tag is not attached to this source.");
  }
}
