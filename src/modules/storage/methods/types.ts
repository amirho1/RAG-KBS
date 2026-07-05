import type { StorageProvider } from "../../../generated/prisma/enums.js";

export type SourceIdentity = {
  id: string;
  knowledgeBaseId: string;
  organizationId: string | null;
  projectId: string | null;
};

export type StorageObjectIdentity = {
  id: string;
  tenantId: string;
  provider: StorageProvider;
  bucket: string | null;
  objectKey: string;
};

export type ValidatedUploadFile = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  extension?: string;
  sizeBytes: bigint;
  checksumSha256: string;
};
