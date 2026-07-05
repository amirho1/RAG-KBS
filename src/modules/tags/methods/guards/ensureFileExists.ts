import { NotFoundException } from "@nestjs/common";
import type { TagsService } from "../../tags.service.js";

/**
 * Ensure a file exists for the requested tenant.
 * @param fileId - File ID.
 * @param tenantId - Tenant ID.
 */
export async function ensureFileExists(
  this: TagsService,
  fileId: string,
  tenantId: string
): Promise<void> {
  const file = await this.prisma.documentFile.findFirst({
    where: {
      id: fileId,
      tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!file) {
    throw new NotFoundException("File was not found.");
  }
}
