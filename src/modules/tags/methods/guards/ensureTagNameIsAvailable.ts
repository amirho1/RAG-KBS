import { ConflictException } from "@nestjs/common";
import type { TagsService } from "../../tags.service.js";

/**
 * Ensure no active tag already uses the normalized name in this tenant.
 * @param tenantId - Tenant ID.
 * @param normalizedName - Normalized tag name.
 * @param exceptId - Optional tag ID to exclude.
 */
export async function ensureTagNameIsAvailable(
  this: TagsService,
  tenantId: string,
  normalizedName: string,
  exceptId?: string
): Promise<void> {
  const duplicateTag = await this.prisma.tag.findFirst({
    where: {
      tenantId,
      normalizedName,
      deletedAt: null,
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
    select: {
      id: true,
    },
  });

  if (duplicateTag) {
    throw new ConflictException(
      "A tag with the same normalized name already exists for this tenant."
    );
  }
}
