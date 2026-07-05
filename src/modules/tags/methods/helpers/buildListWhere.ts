import type { Prisma } from "../../../../generated/prisma/client.js";
import { normalizeTagName } from "../../../../common/metadata/name-normalization.js";
import type { ListTagsQuery } from "../../dto/tags.dto.js";
import type { TagsService } from "../../tags.service.js";

/**
 * Build the Prisma filter for tag list queries.
 * @param query - List query.
 * @returns Prisma tag where input.
 */
export function buildListWhere(
  this: TagsService,
  query: ListTagsQuery
): Prisma.TagWhereInput {
  const searchWhere: Prisma.TagWhereInput | undefined = query.search
    ? {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          {
            normalizedName: {
              contains: normalizeTagName(query.search),
              mode: "insensitive",
            },
          },
        ],
      }
    : undefined;

  return {
    tenantId: query.tenantId,
    organizationId: query.organizationId,
    projectId: query.projectId,
    deletedAt: null,
    ...(searchWhere ? searchWhere : {}),
  };
}
