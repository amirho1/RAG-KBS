import { z } from "zod";

/**
 * Accept comma-separated or repeated query string values.
 * @param value - Raw query value.
 * @returns Normalized string list.
 */
function normalizeQueryList(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeQueryList(item) as string[]);
  }

  return value;
}

/**
 * Create an optional comma-separated string list schema.
 * @param itemSchema - Schema used for each item.
 * @returns Optional query-list schema.
 */
export function createOptionalQueryListSchema<Item extends z.ZodType>(
  itemSchema: Item
) {
  return z.preprocess(
    normalizeQueryList,
    z.array(itemSchema).min(1).optional()
  );
}

/**
 * Create an optional UUID list query schema.
 * @returns Optional UUID list schema.
 */
export function createOptionalUuidListSchema() {
  return createOptionalQueryListSchema(z.uuid());
}
