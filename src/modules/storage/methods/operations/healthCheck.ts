import type { StorageHealthResult } from "../../interfaces/stored-object.interface.js";
import type { StorageService } from "../../storage.service.js";

/**
 * Run the selected storage driver's health check.
 * @returns Safe storage health result.
 */
export async function healthCheck(
  this: StorageService
): Promise<StorageHealthResult> {
  return this.storageDriver.healthCheck();
}
