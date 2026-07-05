import { ConflictException } from "@nestjs/common";
import { FileStatus } from "../../../../generated/prisma/enums.js";
import type { StorageService } from "../../storage.service.js";

/**
 * Ensure no active document files still reference a storage object.
 * @param storageObjectId - Storage object ID.
 * @param tenantId - Tenant ID.
 */
export async function ensureStorageObjectHasNoActiveFiles(
  this: StorageService,
  storageObjectId: string,
  tenantId: string
): Promise<void> {
  const activeFileCount = await this.prisma.documentFile.count({
    where: {
      storageObjectId,
      tenantId,
      deletedAt: null,
      NOT: {
        status: FileStatus.DELETED,
      },
    },
  });

  if (activeFileCount > 0) {
    throw new ConflictException(
      "Storage object is still referenced by active files."
    );
  }
}
