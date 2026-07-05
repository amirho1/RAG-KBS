import type { StorageProvider } from "../../../../generated/prisma/enums.js";
import type { StorageService } from "../../storage.service.js";

/**
 * Check whether a storage provider matches the configured driver.
 * @param provider - Storage object provider.
 * @returns True when the provider matches the configured driver.
 */
export function isConfiguredProvider(
  this: StorageService,
  provider: StorageProvider
): boolean {
  return provider === this.getConfiguredProvider();
}
