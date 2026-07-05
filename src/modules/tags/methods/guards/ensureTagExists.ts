import { NotFoundException } from "@nestjs/common";
import type { TagsService } from "../../tags.service.js";

/**
 * Ensure a tag exists for the requested tenant.
 * @param id - Tag ID.
 * @param tenantId - Tenant ID.
 */
export async function ensureTagExists(
  this: TagsService,
  id: string,
  tenantId: string
): Promise<void> {
  const tag = await this.prisma.tag.findFirst({
    where: {
      id,
      tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!tag) {
    throw new NotFoundException("Tag was not found.");
  }
}
