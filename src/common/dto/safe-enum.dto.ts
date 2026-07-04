import { z } from "zod";

/**
 * Create a strict enum schema from allowed string values.
 * @param values - Allowed enum values.
 * @returns A Zod enum schema.
 */
export function createSafeEnumSchema<
  const Values extends readonly [string, ...string[]],
>(values: Values) {
  return z.enum(values);
}
