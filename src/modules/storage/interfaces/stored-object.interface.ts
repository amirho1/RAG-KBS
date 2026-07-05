/**
 * Stored object metadata returned by a storage driver.
 */
export interface StoredObject {
  provider: "LOCAL" | "S3";
  bucket?: string;
  objectKey: string;
  region?: string;
  endpoint?: string;
  versionId?: string;
  etag?: string;
  sizeBytes: bigint;
  checksumSha256: string;
}

/**
 * Safe storage health check result returned by a driver.
 */
export interface StorageHealthResult {
  status: "ok" | "error";
  latencyMs: number;
  message?: string;
}
