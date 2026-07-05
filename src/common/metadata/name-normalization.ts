/**
 * Normalize text into a URL-safe slug.
 * @param value - Source value to normalize.
 * @returns A lowercase slug.
 */
export function normalizeSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length > 0 ? slug : "resource";
}

/**
 * Normalize a tag name for tenant-unique matching.
 * @param value - Tag display name.
 * @returns A normalized tag name.
 */
export function normalizeTagName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
