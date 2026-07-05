export type SortableQuery = {
  sortBy?: string;
  sortDirection?: "asc" | "desc";
};

/**
 * Build a Prisma orderBy object from a validated sort query.
 * @param query - Validated sort query.
 * @param defaultSortBy - Field used when no sort field was provided.
 * @returns Prisma-compatible orderBy object.
 */
export function buildOrderBy(
  query: SortableQuery,
  defaultSortBy = "createdAt"
): Record<string, "asc" | "desc"> {
  return {
    [query.sortBy ?? defaultSortBy]: query.sortDirection ?? "asc",
  };
}
