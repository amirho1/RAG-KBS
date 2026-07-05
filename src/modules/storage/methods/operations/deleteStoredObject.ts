import type { StorageService } from "../../storage.service.js";

/**
 * Delete a stored object when no active files still reference it.
 * @param storageObjectId - Storage object ID.
 * @param tenantId - Tenant ID.
 */
export async function deleteStoredObject(
  this: StorageService,
  storageObjectId: string,
  tenantId: string
): Promise<void> {
  const storageObject = await this.ensureStorageObjectExists(
    storageObjectId,
    tenantId
  );

  this.ensureProviderMatchesConfig(storageObject.provider);
  await this.ensureStorageObjectHasNoActiveFiles(storageObjectId, tenantId);

  await this.storageDriver.deleteObject({
    objectKey: storageObject.objectKey,
    bucket: storageObject.bucket ?? undefined,
  });

  await this.prisma.storageObject.update({
    where: { id: storageObjectId },
    data: {
      deletedAt: new Date(),
    },
  });

  this.logger.info({
    event: "storage.object.deleted",
    requestId: this.requestContextService.getRequestId(),
    tenantId,
    storageObjectId,
    driver: this.storage.driver,
  });
}
