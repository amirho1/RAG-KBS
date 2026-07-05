import type { StorageService } from "../../storage.service.js";
import { streamToBuffer } from "../../storage.utils.js";

/**
 * Read a tenant-scoped stored object as a buffer.
 * @param storageObjectId - Storage object ID.
 * @param tenantId - Tenant ID.
 * @returns Object bytes.
 */
export async function getFileBuffer(
  this: StorageService,
  storageObjectId: string,
  tenantId: string
): Promise<Buffer> {
  return streamToBuffer(await this.getFileStream(storageObjectId, tenantId));
}
