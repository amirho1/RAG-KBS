import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { UploadFileInput } from "../../dto/upload-file.dto.js";
import type { StorageService } from "../../storage.service.js";
import type { SourceIdentity } from "../types.js";

/**
 * Ensure the source exists for the tenant and optional knowledge base.
 * @param data - Upload request data.
 * @returns Source identity fields.
 */
export async function ensureSourceExists(
  this: StorageService,
  data: UploadFileInput
): Promise<SourceIdentity> {
  const source = await this.prisma.source.findFirst({
    where: {
      id: data.sourceId,
      tenantId: data.tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      knowledgeBaseId: true,
      organizationId: true,
      projectId: true,
    },
  });

  if (!source) {
    throw new NotFoundException("Source was not found.");
  }

  if (data.knowledgeBaseId && data.knowledgeBaseId !== source.knowledgeBaseId) {
    throw new BadRequestException("knowledgeBaseId does not match the source.");
  }

  if (
    data.organizationId &&
    source.organizationId &&
    data.organizationId !== source.organizationId
  ) {
    throw new BadRequestException("organizationId does not match the source.");
  }

  if (
    data.projectId &&
    source.projectId &&
    data.projectId !== source.projectId
  ) {
    throw new BadRequestException("projectId does not match the source.");
  }

  return source;
}
