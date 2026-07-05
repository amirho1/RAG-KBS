import { BadRequestException } from "@nestjs/common";
import type { StorageProvider } from "../../../../generated/prisma/enums.js";
import type { StorageService } from "../../storage.service.js";

/**
 * Ensure metadata provider matches the configured runtime driver.
 * @param provider - Storage object provider.
 */
export function ensureProviderMatchesConfig(
  this: StorageService,
  provider: StorageProvider
): void {
  if (!this.isConfiguredProvider(provider)) {
    throw new BadRequestException(
      "Storage object belongs to a different storage provider."
    );
  }
}
