import { Injectable } from "@nestjs/common";
import type { MetadataJson } from "../../../common/dto/metadata.dto.js";
import { retrievalTextPreviewLength } from "../retrieval.constants.js";
import type {
  MapRetrievalResultsInput,
  RetrievalResponseResult,
} from "../retrieval.types.js";

/**
 * Maps Qdrant search results into stable API retrieval results.
 */
@Injectable()
export class RetrievalResponseMapperService {
  /**
   * Map Qdrant search results into safe chunk results.
   * @param input - Mapping input.
   * @returns Safe retrieval results.
   */
  mapSearchResults(input: MapRetrievalResultsInput): RetrievalResponseResult[] {
    const results: RetrievalResponseResult[] = [];

    for (const result of input.results) {
      const payload = result.payload;

      if (!payload) {
        continue;
      }

      const chunkId = getString(payload, "chunkId");
      const sourceId = getString(payload, "sourceId");
      const fileId = getString(payload, "fileId");

      if (!chunkId || !sourceId || !fileId) {
        continue;
      }

      const text = getString(payload, "text");
      const textPreview =
        getString(payload, "textPreview") ?? createTextPreview(text);
      const metadata = input.includeMetadata
        ? buildResponseMetadata(payload)
        : undefined;
      const mappedResult: RetrievalResponseResult = {
        rank: results.length + 1,
        score: result.score,
        chunkId,
        sourceId,
        fileId,
        ...(input.includeText && text ? { text } : {}),
        textPreview,
        ...(metadata ? { metadata } : {}),
        chunkEmbeddingId: getString(payload, "chunkEmbeddingId"),
        qdrantPointId: String(result.id),
        persistedPayload: buildPersistedPayload(payload, result.score),
      };

      results.push(mappedResult);
    }

    return results;
  }
}

/**
 * Build response metadata from an allowlist of Qdrant payload fields.
 * @param payload - Qdrant payload.
 * @returns Safe response metadata.
 */
function buildResponseMetadata(
  payload: Record<string, unknown>
): Record<string, MetadataJson> | undefined {
  const metadata = removeUndefinedValues({
    title: getString(payload, "title"),
    description: getString(payload, "description"),
    tags: getStringArray(payload, "tags"),
    mimeType: getString(payload, "mimeType"),
    language: getString(payload, "language"),
    sourceType: getString(payload, "sourceType"),
    fileType: getString(payload, "fileType"),
    chunkIndex: getNumber(payload, "chunkIndex"),
    pageStart: getNumber(payload, "pageStart"),
    pageEnd: getNumber(payload, "pageEnd"),
    headingPath: getMetadataJson(payload, "headingPath"),
  });

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

/**
 * Build a sanitized payload for persistence.
 * @param payload - Qdrant payload.
 * @param score - Search score.
 * @returns Safe payload without full text or vectors.
 */
function buildPersistedPayload(
  payload: Record<string, unknown>,
  score: number | undefined
): Record<string, MetadataJson> {
  return removeUndefinedValues({
    score,
    tenantId: getString(payload, "tenantId"),
    knowledgeBaseId: getString(payload, "knowledgeBaseId"),
    sourceId: getString(payload, "sourceId"),
    fileId: getString(payload, "fileId"),
    chunkId: getString(payload, "chunkId"),
    chunkEmbeddingId: getString(payload, "chunkEmbeddingId"),
    qdrantCollectionId: getString(payload, "qdrantCollectionId"),
    mimeType: getString(payload, "mimeType"),
    language: getString(payload, "language"),
    tags: getStringArray(payload, "tags"),
    title: getString(payload, "title"),
    chunkIndex: getNumber(payload, "chunkIndex"),
    pageStart: getNumber(payload, "pageStart"),
    pageEnd: getNumber(payload, "pageEnd"),
    headingPath: getMetadataJson(payload, "headingPath"),
    textPreview: getString(payload, "textPreview"),
  });
}

/**
 * Read a string field from a payload.
 * @param payload - Qdrant payload.
 * @param key - Payload key.
 * @returns String value.
 */
function getString(
  payload: Record<string, unknown>,
  key: string
): string | undefined {
  const value = payload[key];

  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Read a number field from a payload.
 * @param payload - Qdrant payload.
 * @param key - Payload key.
 * @returns Number value.
 */
function getNumber(
  payload: Record<string, unknown>,
  key: string
): number | undefined {
  const value = payload[key];

  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

/**
 * Read a string array field from a payload.
 * @param payload - Qdrant payload.
 * @param key - Payload key.
 * @returns String array.
 */
function getStringArray(
  payload: Record<string, unknown>,
  key: string
): string[] | undefined {
  const value = payload[key];

  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value.filter(
    (item): item is string => typeof item === "string" && item.length > 0
  );

  return strings.length > 0 ? strings : undefined;
}

/**
 * Read a JSON-compatible metadata field from a payload.
 * @param payload - Qdrant payload.
 * @param key - Payload key.
 * @returns JSON-compatible metadata.
 */
function getMetadataJson(
  payload: Record<string, unknown>,
  key: string
): MetadataJson | undefined {
  const value = payload[key];

  return isMetadataJson(value) ? value : undefined;
}

/**
 * Check whether a value is JSON-compatible metadata.
 * @param value - Value to check.
 * @returns True when the value is JSON-compatible.
 */
function isMetadataJson(value: unknown): value is MetadataJson {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return typeof value !== "number" || Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every(isMetadataJson);
  }

  if (typeof value === "object" && value !== null) {
    return Object.values(value).every(isMetadataJson);
  }

  return false;
}

/**
 * Create a bounded text preview.
 * @param text - Full text, if present.
 * @returns Text preview.
 */
function createTextPreview(text: string | undefined): string {
  if (!text) {
    return "";
  }

  if (text.length <= retrievalTextPreviewLength) {
    return text;
  }

  return `${text.slice(0, retrievalTextPreviewLength).trim()}...`;
}

/**
 * Remove undefined values from metadata.
 * @param value - Metadata with optional fields.
 * @returns Metadata without undefined fields.
 */
function removeUndefinedValues(
  value: Record<string, MetadataJson | undefined>
): Record<string, MetadataJson> {
  const result: Record<string, MetadataJson> = {};

  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) {
      continue;
    }

    result[key] = item;
  }

  return result;
}
