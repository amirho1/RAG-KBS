/**
 * Convert values that JSON cannot serialize into API-safe values.
 * @param value - Value to serialize safely.
 * @returns JSON-safe value.
 */
export function serializeJsonResponse(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeJsonResponse(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        serializeJsonResponse(nestedValue),
      ])
    );
  }

  return value;
}
