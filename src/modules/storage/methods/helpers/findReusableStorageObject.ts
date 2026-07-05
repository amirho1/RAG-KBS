import type { StorageService } from "../../storage.service.js";

/**
 * Find an existing tenant storage object for physical deduplication.
 * @param tenantId - Tenant ID.
 * @param checksumSha256 - File checksum.
 * @returns Existing storage object, if available.
 */
export async function findReusableStorageObject(
  this: StorageService,
  tenantId: string,
  checksumSha256: string
) {
  return this.prisma.storageObject.findFirst({
    where: {
      tenantId,
      checksumSha256,
      provider: this.getConfiguredProvider(),
      deletedAt: null,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}
