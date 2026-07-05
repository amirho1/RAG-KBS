import type { StorageService } from "../../storage.service.js";

/**
 * Read a tenant-scoped stored object as a stream.
 * @param storageObjectId - Storage object ID.
 * @param tenantId - Tenant ID.
 * @returns Object stream or buffer.
 */
export async function getFileStream(
  this: StorageService,
  storageObjectId: string,
  tenantId: string
): Promise<NodeJS.ReadableStream | Buffer> {
  const storageObject = await this.ensureStorageObjectExists(
    storageObjectId,
    tenantId
  );

  this.ensureProviderMatchesConfig(storageObject.provider);

  this.logger.info({
    event: "storage.object.read",
    requestId: this.requestContextService.getRequestId(),
    tenantId,
    storageObjectId,
    driver: this.storage.driver,
  });

  return this.storageDriver.getObject({
    objectKey: storageObject.objectKey,
    bucket: storageObject.bucket ?? undefined,
  });
}
