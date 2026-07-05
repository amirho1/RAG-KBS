import { serializeJsonResponse } from "../../../../common/metadata/json-response.js";
import { buildPaginatedResult } from "../../../../common/metadata/pagination.js";
import { buildOrderBy } from "../../../../common/metadata/sorting.js";
import type { ListTagsQuery } from "../../dto/tags.dto.js";
import type { TagsService } from "../../tags.service.js";

/**
 * List tenant-scoped tags.
 * @param query - List query.
 * @returns Paginated tags.
 */
export async function list(this: TagsService, query: ListTagsQuery) {
  const where = this.buildListWhere(query);
  const [items, total] = await Promise.all([
    this.prisma.tag.findMany({
      where,
      orderBy: buildOrderBy(query),
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    this.prisma.tag.count({ where }),
  ]);

  return buildPaginatedResult(
    items.map((item) => serializeJsonResponse(item)),
    query,
    total
  );
}
