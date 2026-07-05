import { serializeJsonResponse } from "../../../../common/metadata/json-response.js";
import { NotFoundException } from "@nestjs/common";
import type { TagsService } from "../../tags.service.js";

/**
 * Get one tenant-scoped tag.
 * @param id - Tag ID.
 * @param tenantId - Tenant ID.
 * @returns The matching tag.
 */
export async function getById(
  this: TagsService,
  id: string,
  tenantId: string
): Promise<Record<string, unknown>> {
  const tag = await this.prisma.tag.findFirst({
    where: {
      id,
      tenantId,
      deletedAt: null,
    },
  });

  if (!tag) {
    throw new NotFoundException("Tag was not found.");
  }

  return serializeJsonResponse(tag) as Record<string, unknown>;
}
