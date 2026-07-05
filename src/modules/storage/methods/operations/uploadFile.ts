import { serializeJsonResponse } from "../../../../common/metadata/json-response.js";
import type { UploadFileInput } from "../../dto/upload-file.dto.js";
import type { UploadedFile } from "../../interfaces/uploaded-file.interface.js";
import type { StorageService } from "../../storage.service.js";

/**
 * Get a safe error name for storage logs.
 * @param error - Caught error.
 * @returns Safe error name.
 */
function getSafeErrorName(error: unknown): string {
  if (error instanceof Error) {
    return error.name;
  }

  return "UnknownError";
}

/**
 * Upload a file, store its bytes, and create metadata records.
 * @param data - Validated upload fields.
 * @param file - Uploaded multipart file.
 * @returns Safe storage object and document file metadata.
 */
export async function uploadFile(
  this: StorageService,
  data: UploadFileInput,
  file: UploadedFile | undefined
): Promise<Record<string, unknown>> {
  const startedAt = Date.now();
  const uploadFile = this.validateUploadedFile(file);

  this.logger.info({
    event: "storage.upload.started",
    requestId: this.requestContextService.getRequestId(),
    tenantId: data.tenantId,
    sourceId: data.sourceId,
    driver: this.storage.driver,
    mimeType: uploadFile.mimeType,
    sizeBytes: uploadFile.sizeBytes.toString(),
    checksumSha256: uploadFile.checksumSha256,
  });

  try {
    const source = await this.ensureSourceExists(data);
    await this.ensureFileChecksumIsAvailable(
      data.tenantId,
      data.sourceId,
      uploadFile.checksumSha256
    );

    const storageObject =
      (await this.findReusableStorageObject(
        data.tenantId,
        uploadFile.checksumSha256
      )) ?? (await this.storeNewObject(data, uploadFile));

    const documentFile = await this.createDocumentFile(
      data,
      source,
      storageObject.id,
      uploadFile
    );

    this.logger.info({
      event: "storage.upload.completed",
      requestId: this.requestContextService.getRequestId(),
      tenantId: data.tenantId,
      sourceId: data.sourceId,
      storageObjectId: storageObject.id,
      fileId: documentFile.id,
      driver: this.storage.driver,
      mimeType: uploadFile.mimeType,
      sizeBytes: uploadFile.sizeBytes.toString(),
      checksumSha256: uploadFile.checksumSha256,
      durationMs: Date.now() - startedAt,
    });

    return {
      storageObject: serializeJsonResponse(storageObject),
      file: serializeJsonResponse(documentFile),
    };
  } catch (error) {
    this.logger.errorPayload({
      event: "storage.upload.failed",
      requestId: this.requestContextService.getRequestId(),
      tenantId: data.tenantId,
      sourceId: data.sourceId,
      driver: this.storage.driver,
      mimeType: uploadFile.mimeType,
      sizeBytes: uploadFile.sizeBytes.toString(),
      checksumSha256: uploadFile.checksumSha256,
      durationMs: Date.now() - startedAt,
      errorName: getSafeErrorName(error),
    });

    throw error;
  }
}
