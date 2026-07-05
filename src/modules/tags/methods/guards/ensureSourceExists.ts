import { NotFoundException } from "@nestjs/common";
import type { TagsService } from "../../tags.service.js";

/**
 * Ensure a source exists for the requested tenant.
 * @param sourceId - Source ID.
 * @param tenantId - Tenant ID.
 */
export async function ensureSourceExists(
  this: TagsService,
  sourceId: string,
  tenantId: string
): Promise<void> {
  const source = await this.prisma.source.findFirst({
    where: {
      id: sourceId,
      tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!source) {
    throw new NotFoundException("Source was not found.");
  }
}
