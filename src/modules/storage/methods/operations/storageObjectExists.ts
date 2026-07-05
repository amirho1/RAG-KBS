import type { StorageService } from "../../storage.service.js";

/**
 * Check whether a tenant-scoped stored object exists physically.
 * @param storageObjectId - Storage object ID.
 * @param tenantId - Tenant ID.
 * @returns True when metadata and physical object both exist.
 */
export async function storageObjectExists(
  this: StorageService,
  storageObjectId: string,
  tenantId: string
): Promise<boolean> {
  const storageObject = await this.prisma.storageObject.findFirst({
    where: {
      id: storageObjectId,
      tenantId,
      deletedAt: null,
    },
    select: {
      provider: true,
      bucket: true,
      objectKey: true,
    },
  });

  if (!storageObject) {
    return false;
  }

  if (!this.isConfiguredProvider(storageObject.provider)) {
    return false;
  }

  return this.storageDriver.exists({
    objectKey: storageObject.objectKey,
    bucket: storageObject.bucket ?? undefined,
  });
}
