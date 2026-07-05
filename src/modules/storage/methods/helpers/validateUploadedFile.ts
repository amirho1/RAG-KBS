import { BadRequestException } from "@nestjs/common";
import type { UploadedFile } from "../../interfaces/uploaded-file.interface.js";
import type { StorageService } from "../../storage.service.js";
import { bytesPerMegabyte } from "../../storage.constants.js";
import {
  calculateSha256,
  getSafeFileExtension,
  getSafeOriginalName,
  isMimeTypeAllowed,
  normalizeMimeType,
} from "../../storage.utils.js";
import type { ValidatedUploadFile } from "../types.js";

/**
 * Validate uploaded file metadata and bytes.
 * @param file - Uploaded file.
 * @returns Validated upload file data.
 */
export function validateUploadedFile(
  this: StorageService,
  file: UploadedFile | undefined
): ValidatedUploadFile {
  if (!file) {
    throw new BadRequestException("File is required.");
  }

  if (!file.buffer || !Buffer.isBuffer(file.buffer)) {
    throw new BadRequestException("Uploaded file bytes were not provided.");
  }

  const originalName = getSafeOriginalName(file.originalname);

  if (originalName.length === 0) {
    throw new BadRequestException("Uploaded filename is required.");
  }

  if (originalName.length > 512) {
    throw new BadRequestException("Uploaded filename is too long.");
  }

  if (file.buffer.length === 0) {
    throw new BadRequestException("Uploaded file must not be empty.");
  }

  const maxUploadSizeBytes = this.ingestion.maxUploadSizeMb * bytesPerMegabyte;

  if (file.buffer.length > maxUploadSizeBytes) {
    throw new BadRequestException("Uploaded file exceeds the size limit.");
  }

  const mimeType = normalizeMimeType(file.mimetype);

  if (!isMimeTypeAllowed(mimeType, this.storage.allowedUploadMimeTypes)) {
    throw new BadRequestException("Uploaded file MIME type is not allowed.");
  }

  return {
    buffer: file.buffer,
    originalName,
    mimeType,
    extension: getSafeFileExtension(originalName, mimeType),
    sizeBytes: BigInt(file.buffer.length),
    checksumSha256: calculateSha256(file.buffer),
  };
}
