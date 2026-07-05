import { StorageProvider } from "../../../../generated/prisma/enums.js";
import type { StorageService } from "../../storage.service.js";

/**
 * Get the Prisma storage provider for the configured driver.
 * @returns Configured storage provider.
 */
export function getConfiguredProvider(this: StorageService): StorageProvider {
  return this.storage.driver === "local"
    ? StorageProvider.LOCAL
    : StorageProvider.S3;
}
