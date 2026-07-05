import { ConflictException } from "@nestjs/common";
import { isPrismaUniqueConstraintError } from "../../../../common/metadata/prisma-errors.js";
import type { UploadFileInput } from "../../dto/upload-file.dto.js";
import type { StorageService } from "../../storage.service.js";
import { createStorageObjectKey } from "../../storage.utils.js";
import type { ValidatedUploadFile } from "../types.js";

/**
 * Store a new physical object and persist storage metadata.
 * @param data - Upload request data.
 * @param file - Validated upload file.
 * @returns Created storage object metadata.
 */
export async function storeNewObject(
  this: StorageService,
  data: UploadFileInput,
  file: ValidatedUploadFile
) {
  const objectKey = createStorageObjectKey({
    tenantId: data.tenantId,
    sourceId: data.sourceId,
    checksumSha256: file.checksumSha256,
    originalName: file.originalName,
    mimeType: file.mimeType,
  });
  const storedObject = await this.storageDriver.putObject({
    objectKey,
    body: file.buffer,
    sizeBytes: file.sizeBytes,
    checksumSha256: file.checksumSha256,
    contentType: file.mimeType,
  });

  try {
    return await this.createStorageObject(data, file, storedObject);
  } catch (error) {
    await this.storageDriver
      .deleteObject({
        objectKey: storedObject.objectKey,
        bucket: storedObject.bucket,
      })
      .catch(() => undefined);

    if (isPrismaUniqueConstraintError(error)) {
      throw new ConflictException(
        "A storage object with the same provider, bucket, and object key already exists for this tenant."
      );
    }

    throw error;
  }
}
