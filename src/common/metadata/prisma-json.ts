import { Prisma } from "../../generated/prisma/client.js";
import type { MetadataJson } from "../dto/metadata.dto.js";

/**
 * Convert nullable API metadata values into Prisma JSON input values.
 * @param value - API metadata value.
 * @returns Prisma-compatible JSON input.
 */
export function toPrismaNullableJson(
  value: Record<string, MetadataJson> | null | undefined
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.DbNull;
  }

  return value;
}
