export const retrievalMaxQueryLength = 8_000;
export const retrievalMaxFilterValues = 100;
export const retrievalTextPreviewLength = 240;

export const retrievalQueryReceivedEvent = "retrieval.query.received";
export const retrievalEmbeddingStartedEvent = "retrieval.embedding.started";
export const retrievalEmbeddingCompletedEvent = "retrieval.embedding.completed";
export const retrievalQdrantSearchStartedEvent =
  "retrieval.qdrant.search.started";
export const retrievalQdrantSearchCompletedEvent =
  "retrieval.qdrant.search.completed";
export const retrievalResultsMappedEvent = "retrieval.results.mapped";
export const retrievalQueryCompletedEvent = "retrieval.query.completed";
export const retrievalQueryFailedEvent = "retrieval.query.failed";

export const retrievalErrorCodes = [
  "EMPTY_QUERY",
  "INVALID_RETRIEVAL_FILTER",
  "KNOWLEDGE_BASE_NOT_FOUND",
  "EMBEDDING_CONFIG_NOT_FOUND",
  "EMBEDDING_MODEL_NOT_FOUND",
  "QUERY_EMBEDDING_FAILED",
  "EMBEDDING_DIMENSION_MISMATCH",
  "QDRANT_COLLECTION_NOT_FOUND",
  "QDRANT_SEARCH_FAILED",
  "RETRIEVAL_TIMEOUT",
  "RETRIEVAL_FAILED",
] as const;

export const retrievalSafeErrorMessages = {
  EMPTY_QUERY: "Query must not be empty.",
  INVALID_RETRIEVAL_FILTER: "Retrieval filters are invalid.",
  KNOWLEDGE_BASE_NOT_FOUND: "Knowledge base was not found.",
  EMBEDDING_CONFIG_NOT_FOUND: "Default embedding config was not found.",
  EMBEDDING_MODEL_NOT_FOUND: "Embedding model was not found.",
  QUERY_EMBEDDING_FAILED: "Query embedding failed.",
  EMBEDDING_DIMENSION_MISMATCH:
    "Query embedding dimension does not match the Qdrant collection.",
  QDRANT_COLLECTION_NOT_FOUND: "Default Qdrant read collection was not found.",
  QDRANT_SEARCH_FAILED: "Qdrant search failed.",
  RETRIEVAL_TIMEOUT: "Retrieval timed out.",
  RETRIEVAL_FAILED: "Retrieval failed.",
} as const;
