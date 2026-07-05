import type { PaginationQuery } from "../dto/pagination-query.dto.js";

export type PaginatedResult<Item> = {
  data: Item[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Calculate the database offset for a pagination query.
 * @param query - Pagination query.
 * @returns Number of records to skip.
 */
export function getPaginationOffset(query: PaginationQuery): number {
  return (query.page - 1) * query.limit;
}

/**
 * Build a consistent paginated API response.
 * @param data - Page records.
 * @param query - Pagination query.
 * @param total - Total matching records.
 * @returns Paginated response payload.
 */
export function buildPaginatedResult<Item>(
  data: Item[],
  query: PaginationQuery,
  total: number
): PaginatedResult<Item> {
  return {
    data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}
