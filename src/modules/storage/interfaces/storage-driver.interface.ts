import type {
  StoredObject,
  StorageHealthResult,
} from "./stored-object.interface.js";

/**
 * Input used to store an object in the configured storage backend.
 */
export interface PutObjectInput {
  objectKey: string;
  bucket?: string;
  body: Buffer | NodeJS.ReadableStream;
  sizeBytes: bigint;
  checksumSha256: string;
  contentType?: string;
}

/**
 * Input used to read an object from storage.
 */
export interface GetObjectInput {
  objectKey: string;
  bucket?: string;
}

/**
 * Input used to delete an object from storage.
 */
export interface DeleteObjectInput {
  objectKey: string;
  bucket?: string;
}

/**
 * Input used to check whether an object exists.
 */
export interface ExistsObjectInput {
  objectKey: string;
  bucket?: string;
}

/**
 * Input used by drivers that support signed URLs.
 */
export interface GetSignedUrlInput {
  objectKey: string;
  bucket?: string;
  expiresInSeconds: number;
}

/**
 * Common interface implemented by storage drivers.
 */
export interface StorageDriver {
  /**
   * Store an object.
   * @param input - Object storage input.
   * @returns Stored object metadata.
   */
  putObject(input: PutObjectInput): Promise<StoredObject>;

  /**
   * Read an object.
   * @param input - Object read input.
   * @returns A stream or buffer containing the object bytes.
   */
  getObject(input: GetObjectInput): Promise<NodeJS.ReadableStream | Buffer>;

  /**
   * Delete an object.
   * @param input - Object delete input.
   */
  deleteObject(input: DeleteObjectInput): Promise<void>;

  /**
   * Check whether an object exists.
   * @param input - Object existence input.
   * @returns True when the object exists.
   */
  exists(input: ExistsObjectInput): Promise<boolean>;

  /**
   * Create a temporary signed URL when the driver supports it.
   * @param input - Signed URL input.
   * @returns Signed object URL.
   */
  getSignedUrl?(input: GetSignedUrlInput): Promise<string>;

  /**
   * Verify storage backend health.
   * @returns Safe health result.
   */
  healthCheck(): Promise<StorageHealthResult>;
}
