import { ConflictException } from "@nestjs/common";
import type { StorageService } from "../../storage.service.js";

/**
 * Ensure the same file checksum is not already active in the source.
 * @param tenantId - Tenant ID.
 * @param sourceId - Source ID.
 * @param checksumSha256 - File checksum.
 */
export async function ensureFileChecksumIsAvailable(
  this: StorageService,
  tenantId: string,
  sourceId: string,
  checksumSha256: string
): Promise<void> {
  const existingFile = await this.prisma.documentFile.findFirst({
    where: {
      tenantId,
      sourceId,
      checksumSha256,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (existingFile) {
    throw new ConflictException(
      "A file with the same checksum already exists in this source."
    );
  }
}
