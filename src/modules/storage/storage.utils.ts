import { createHash, randomUUID } from "node:crypto";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { posix } from "node:path";
import { DocumentFileType } from "../../generated/prisma/enums.js";

const safeSegmentPattern = /[^A-Za-z0-9._=-]+/g;
const repeatedDashPattern = /-+/g;
const safeExtensionPattern = /^[a-z0-9]{1,32}$/;

const extensionByMimeType: Record<string, string> = {
  "application/json": "json",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/csv": "csv",
  "text/html": "html",
  "text/markdown": "md",
  "text/plain": "txt",
};

/**
 * Data used to create a safe storage object key.
 */
export interface CreateStorageObjectKeyInput {
  tenantId: string;
  sourceId: string;
  checksumSha256: string;
  originalName?: string;
  mimeType?: string;
  now?: Date;
}

/**
 * Calculate the SHA-256 checksum for a file buffer.
 * @param buffer - File bytes.
 * @returns Lowercase SHA-256 hex digest.
 */
export function calculateSha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Convert a stream or buffer into a buffer.
 * @param value - Stream or buffer value.
 * @returns Buffered object bytes.
 */
export async function streamToBuffer(
  value: NodeJS.ReadableStream | Buffer
): Promise<Buffer> {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  const chunks: Buffer[] = [];

  for await (const chunk of value as unknown as AsyncIterable<
    Buffer | string | Uint8Array
  >) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

/**
 * Normalize a MIME type for allowlist comparisons.
 * @param mimeType - Raw MIME type.
 * @returns Lowercase trimmed MIME type.
 */
export function normalizeMimeType(mimeType: string): string {
  return mimeType.trim().toLowerCase();
}

/**
 * Check whether a MIME type is accepted by the allowlist.
 * @param mimeType - MIME type from the upload.
 * @param allowedMimeTypes - Allowed MIME types from config.
 * @returns True when the MIME type is allowed.
 */
export function isMimeTypeAllowed(
  mimeType: string,
  allowedMimeTypes: string[]
): boolean {
  return allowedMimeTypes.includes(normalizeMimeType(mimeType));
}

/**
 * Create a safe object key for local and S3-compatible storage.
 * @param input - Object key input.
 * @returns Safe object key.
 */
export function createStorageObjectKey(
  input: CreateStorageObjectKeyInput
): string {
  const now = input.now ?? new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const extension = getSafeFileExtension(input.originalName, input.mimeType);
  const extensionSuffix = extension ? `.${extension}` : "";

  return [
    "tenants",
    sanitizeObjectKeySegment(input.tenantId),
    "sources",
    sanitizeObjectKeySegment(input.sourceId),
    `year=${year}`,
    `month=${month}`,
    `${randomUUID()}-${input.checksumSha256}${extensionSuffix}`,
  ].join("/");
}

/**
 * Sanitize one object key path segment.
 * @param value - Raw segment value.
 * @returns Safe segment value.
 */
export function sanitizeObjectKeySegment(value: string): string {
  const sanitized = value
    .trim()
    .replace(safeSegmentPattern, "-")
    .replace(repeatedDashPattern, "-")
    .replace(/^-|-$/g, "");

  return sanitized.length > 0 ? sanitized : "unknown";
}

/**
 * Get a safe lowercase file extension from filename or MIME type.
 * @param originalName - Original upload filename.
 * @param mimeType - Upload MIME type.
 * @returns Safe extension when one can be determined.
 */
export function getSafeFileExtension(
  originalName?: string,
  mimeType?: string
): string | undefined {
  const rawExtension = originalName ? extname(originalName).slice(1) : "";
  const normalizedExtension = rawExtension.trim().toLowerCase();

  if (safeExtensionPattern.test(normalizedExtension)) {
    return normalizedExtension;
  }

  if (!mimeType) {
    return undefined;
  }

  return extensionByMimeType[normalizeMimeType(mimeType)];
}

/**
 * Keep only the filename portion of an uploaded original name.
 * @param originalName - Raw original upload name.
 * @returns Filename metadata without path separators.
 */
export function getSafeOriginalName(originalName: string): string {
  return originalName.split(/[\\/]/).pop()?.trim() ?? "";
}

/**
 * Infer a logical document file type from MIME type and extension.
 * @param mimeType - File MIME type.
 * @param originalName - Original upload filename.
 * @returns Document file type.
 */
export function inferDocumentFileType(
  mimeType: string,
  originalName?: string
): DocumentFileType {
  const normalizedMimeType = normalizeMimeType(mimeType);
  const extension = getSafeFileExtension(originalName, normalizedMimeType);

  if (normalizedMimeType === "application/pdf" || extension === "pdf") {
    return DocumentFileType.PDF;
  }

  if (
    normalizedMimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  ) {
    return DocumentFileType.DOCX;
  }

  if (normalizedMimeType === "text/markdown" || extension === "md") {
    return DocumentFileType.MARKDOWN;
  }

  if (normalizedMimeType === "text/plain" || extension === "txt") {
    return DocumentFileType.TXT;
  }

  if (normalizedMimeType === "text/html" || extension === "html") {
    return DocumentFileType.HTML;
  }

  if (normalizedMimeType === "text/csv" || extension === "csv") {
    return DocumentFileType.CSV;
  }

  if (
    normalizedMimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    extension === "xlsx"
  ) {
    return DocumentFileType.XLSX;
  }

  if (normalizedMimeType === "application/json" || extension === "json") {
    return DocumentFileType.JSON;
  }

  return DocumentFileType.UNKNOWN;
}

/**
 * Resolve an object key to a local filesystem path without allowing traversal.
 * @param rootPath - Configured local storage root.
 * @param objectKey - Storage object key.
 * @returns Absolute local path inside the storage root.
 */
export function resolveSafeLocalObjectPath(
  rootPath: string,
  objectKey: string
): string {
  if (objectKey.includes("\0")) {
    throw new Error("Object key contains an invalid character.");
  }

  const normalizedKey = posix.normalize(objectKey.replace(/\\/g, "/"));

  if (
    normalizedKey === "." ||
    normalizedKey === ".." ||
    normalizedKey.startsWith("../") ||
    posix.isAbsolute(normalizedKey)
  ) {
    throw new Error("Object key escapes the storage root.");
  }

  const resolvedRootPath = resolve(rootPath);
  const resolvedObjectPath = resolve(resolvedRootPath, normalizedKey);
  const relativePath = relative(resolvedRootPath, resolvedObjectPath);

  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error("Object key escapes the storage root.");
  }

  return resolvedObjectPath;
}

/**
 * Determine whether a value is a Node.js readable stream.
 * @param value - Unknown value.
 * @returns True when the value is a readable stream.
 */
export function isNodeReadableStream(
  value: unknown
): value is NodeJS.ReadableStream {
  return (
    typeof value === "object" &&
    value !== null &&
    "pipe" in value &&
    typeof value.pipe === "function"
  );
}
