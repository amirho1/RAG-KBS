import { ConflictException } from "@nestjs/common";
import { isPrismaUniqueConstraintError } from "../../../../common/metadata/prisma-errors.js";
import { toPrismaNullableJson } from "../../../../common/metadata/prisma-json.js";
import { FileStatus } from "../../../../generated/prisma/enums.js";
import type { UploadFileInput } from "../../dto/upload-file.dto.js";
import type { StorageService } from "../../storage.service.js";
import { inferDocumentFileType } from "../../storage.utils.js";
import type { SourceIdentity, ValidatedUploadFile } from "../types.js";

/**
 * Create logical document file metadata for the uploaded object.
 * @param data - Upload request data.
 * @param source - Source identity fields.
 * @param storageObjectId - Storage object ID.
 * @param file - Validated upload file.
 * @returns Created document file.
 */
export async function createDocumentFile(
  this: StorageService,
  data: UploadFileInput,
  source: SourceIdentity,
  storageObjectId: string,
  file: ValidatedUploadFile
) {
  try {
    return await this.prisma.documentFile.create({
      data: {
        tenantId: data.tenantId,
        organizationId: data.organizationId ?? source.organizationId,
        projectId: data.projectId ?? source.projectId,
        knowledgeBaseId: source.knowledgeBaseId,
        sourceId: source.id,
        storageObjectId,
        originalName: file.originalName,
        mimeType: file.mimeType,
        extension: file.extension,
        fileType: inferDocumentFileType(file.mimeType, file.originalName),
        sizeBytes: file.sizeBytes,
        checksumSha256: file.checksumSha256,
        status: FileStatus.STORED,
        title: data.title,
        description: data.description,
        metadata: toPrismaNullableJson(data.metadata),
      },
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new ConflictException(
        "A file with the same checksum or external ID already exists in this source."
      );
    }

    throw error;
  }
}
