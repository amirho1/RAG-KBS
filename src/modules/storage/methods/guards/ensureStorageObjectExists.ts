import { NotFoundException } from "@nestjs/common";
import type { StorageService } from "../../storage.service.js";
import type { StorageObjectIdentity } from "../types.js";

/**
 * Ensure a storage object belongs to the requested tenant.
 * @param storageObjectId - Storage object ID.
 * @param tenantId - Tenant ID.
 * @returns Storage object identity fields.
 */
export async function ensureStorageObjectExists(
  this: StorageService,
  storageObjectId: string,
  tenantId: string
): Promise<StorageObjectIdentity> {
  const storageObject = await this.prisma.storageObject.findFirst({
    where: {
      id: storageObjectId,
      tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      tenantId: true,
      provider: true,
      bucket: true,
      objectKey: true,
    },
  });

  if (!storageObject) {
    throw new NotFoundException("Storage object was not found.");
  }

  return storageObject;
}
