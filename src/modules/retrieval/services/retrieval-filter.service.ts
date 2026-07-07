import { Injectable } from "@nestjs/common";
import { normalizeTagName } from "../../../common/metadata/name-normalization.js";
import type {
  BuildRetrievalFilterInput,
  NormalizedRetrievalFilters,
  RetrievalFilterInput,
} from "../retrieval.types.js";

type QdrantFieldCondition = {
  key: string;
  match: {
    value?: string;
    any?: string[];
  };
};

type QdrantPayloadFilter = {
  must: QdrantFieldCondition[];
};

/**
 * Builds Qdrant payload filters for retrieval requests.
 */
@Injectable()
export class RetrievalFilterService {
  /**
   * Normalize singular and plural request filters into stable arrays.
   * @param filters - Request filter input.
   * @returns Normalized filter values.
   */
  normalizeFilters(
    filters: RetrievalFilterInput | undefined
  ): NormalizedRetrievalFilters {
    return {
      sourceIds: uniqueStrings([
        ...(filters?.sourceId ? [filters.sourceId] : []),
        ...(filters?.sourceIds ?? []),
      ]),
      fileIds: uniqueStrings([
        ...(filters?.fileId ? [filters.fileId] : []),
        ...(filters?.fileIds ?? []),
      ]),
      tags: uniqueStrings(
        (filters?.tags ?? []).map((tagName) => normalizeTagName(tagName))
      ),
      mimeTypes: uniqueStrings([
        ...(filters?.mimeType ? [filters.mimeType] : []),
        ...(filters?.mimeTypes ?? []),
      ]),
      language: filters?.language?.trim(),
    };
  }

  /**
   * Build a safe JSON representation of normalized filters.
   * @param filters - Normalized filters.
   * @returns Safe filters for hashing and persistence.
   */
  buildSafeFilters(
    filters: NormalizedRetrievalFilters
  ): Record<string, string[] | string> {
    return removeEmptyFilterValues({
      sourceIds: filters.sourceIds,
      fileIds: filters.fileIds,
      tags: filters.tags,
      mimeTypes: filters.mimeTypes,
      ...(filters.language ? { language: filters.language } : {}),
    });
  }

  /**
   * Build a Qdrant payload filter from normalized request filters.
   * @param input - Filter build input.
   * @returns Qdrant payload filter.
   */
  buildPayloadFilter(input: BuildRetrievalFilterInput): QdrantPayloadFilter {
    const must: QdrantFieldCondition[] = [
      createMatchValueCondition("tenantId", input.tenantId),
      createMatchValueCondition("knowledgeBaseId", input.knowledgeBaseId),
    ];

    appendMatchAnyCondition(must, "sourceId", input.filters.sourceIds);
    appendMatchAnyCondition(must, "fileId", input.filters.fileIds);
    appendMatchAnyCondition(must, "tags", input.tagFilterValues);
    appendMatchAnyCondition(must, "mimeType", input.filters.mimeTypes);

    if (input.filters.language) {
      must.push(createMatchValueCondition("language", input.filters.language));
    }

    return { must };
  }
}

/**
 * Create an exact Qdrant payload match condition.
 * @param key - Payload key.
 * @param value - Payload value.
 * @returns Qdrant field condition.
 */
function createMatchValueCondition(
  key: string,
  value: string
): QdrantFieldCondition {
  return {
    key,
    match: {
      value,
    },
  };
}

/**
 * Append an any-value Qdrant payload condition when values exist.
 * @param conditions - Conditions to mutate.
 * @param key - Payload key.
 * @param values - Payload values.
 */
function appendMatchAnyCondition(
  conditions: QdrantFieldCondition[],
  key: string,
  values: string[]
): void {
  if (values.length === 0) {
    return;
  }

  conditions.push({
    key,
    match: {
      any: values,
    },
  });
}

/**
 * Deduplicate and trim string values.
 * @param values - Values to normalize.
 * @returns Unique normalized values.
 */
function uniqueStrings(values: string[]): string[] {
  return [
    ...new Set(
      values.map((value) => value.trim()).filter((value) => value.length > 0)
    ),
  ];
}

/**
 * Remove empty array values from a filter object.
 * @param value - Filter object.
 * @returns Filter object without empty arrays.
 */
function removeEmptyFilterValues(
  value: Record<string, string[] | string>
): Record<string, string[] | string> {
  const result: Record<string, string[] | string> = {};

  for (const [key, item] of Object.entries(value)) {
    if (Array.isArray(item) && item.length === 0) {
      continue;
    }

    result[key] = item;
  }

  return result;
}
