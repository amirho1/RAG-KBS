import { toPrismaNullableJson } from "../../../../common/metadata/prisma-json.js";
import type { UploadFileInput } from "../../dto/upload-file.dto.js";
import type { StoredObject } from "../../interfaces/stored-object.interface.js";
import type { StorageService } from "../../storage.service.js";
import type { ValidatedUploadFile } from "../types.js";

/**
 * Persist storage object metadata.
 * @param data - Upload request data.
 * @param file - Validated upload file.
 * @param storedObject - Driver storage metadata.
 * @returns Created storage object.
 */
export async function createStorageObject(
  this: StorageService,
  data: UploadFileInput,
  file: ValidatedUploadFile,
  storedObject: StoredObject
) {
  return this.prisma.storageObject.create({
    data: {
      tenantId: data.tenantId,
      organizationId: data.organizationId,
      projectId: data.projectId,
      provider: storedObject.provider,
      bucket: storedObject.bucket,
      objectKey: storedObject.objectKey,
      region: storedObject.region,
      endpoint: storedObject.endpoint,
      versionId: storedObject.versionId,
      originalName: file.originalName,
      mimeType: file.mimeType,
      extension: file.extension,
      sizeBytes: file.sizeBytes,
      checksumSha256: file.checksumSha256,
      etag: storedObject.etag,
      metadata: toPrismaNullableJson(data.metadata),
    },
  });
}
