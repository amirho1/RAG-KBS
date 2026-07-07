# Retrieval

The retrieval module adds the production retrieval API. It embeds a query, searches the active
default Qdrant read collection with payload filters, stores traceability rows, and returns retrieved
chunks only. It does not generate final AI answers; external callers or AI agents decide how to use
the returned context.

## Endpoint

```http
POST /api/v1/query
```

Debug traceability is available through:

```http
GET /api/v1/retrieval-queries/:id?tenantId=tenant_acme
```

The debug endpoint returns query metadata and result summaries without vectors.

## Query request

```json
{
  "tenantId": "tenant_acme",
  "knowledgeBaseId": "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4",
  "query": "How do I upload documents?",
  "topK": 8,
  "scoreThreshold": 0.2,
  "filters": {
    "sourceIds": ["adf1ed11-f72e-4af4-9a1b-9d6d9941d30e"],
    "fileIds": ["113d5fe3-927e-428d-9b55-557a6f776ed9"],
    "tags": ["policy", "api-docs"],
    "mimeTypes": ["text/markdown"],
    "language": "en"
  },
  "includeMetadata": true,
  "includeText": true,
  "metadata": {}
}
```

Supported filters are `tenantId`, `knowledgeBaseId`, `sourceId`/`sourceIds`, `fileId`/`fileIds`,
`tags`, `mimeType`/`mimeTypes`, and `language`. `tenantId` and `knowledgeBaseId` are always
required. Singular and plural forms for the same filter cannot be used together.

## Query response

```json
{
  "queryId": "6db3b2e6-b677-40a6-9a29-383793cf2f25",
  "tenantId": "tenant_acme",
  "knowledgeBaseId": "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4",
  "query": "How do I upload documents?",
  "topK": 8,
  "resultCount": 1,
  "results": [
    {
      "rank": 1,
      "score": 0.82,
      "chunkId": "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b",
      "sourceId": "adf1ed11-f72e-4af4-9a1b-9d6d9941d30e",
      "fileId": "113d5fe3-927e-428d-9b55-557a6f776ed9",
      "text": "To upload a document, send a multipart request...",
      "textPreview": "To upload a document...",
      "metadata": {
        "title": "Upload Guide",
        "tags": ["api-docs"],
        "mimeType": "text/markdown",
        "chunkIndex": 4,
        "headingPath": ["Files", "Upload"]
      }
    }
  ],
  "latencyMs": 42,
  "createdAt": "2026-07-04T00:00:00.000Z"
}
```

`textPreview` is returned by default. Full `text` is returned only when `includeText=true`. Metadata
is returned only when `includeMetadata=true`. Embedding vectors, Qdrant API keys, internal URLs,
database details, storage paths, and secrets are never returned.

## Tenant scoping and Qdrant filtering

The API first validates that the requested knowledge base belongs to the tenant and is active. When
source IDs, file IDs, or tags are provided, it performs lightweight tenant-aware PostgreSQL checks
before searching. Qdrant payload filters are still the primary retrieval filter mechanism, and every
search includes `tenantId` and `knowledgeBaseId` filters to prevent cross-tenant results.

Retrieval uses the default active `EmbeddingConfig` and default active Qdrant read collection for
the tenant. The query embedding dimension must match the selected Qdrant collection. Qdrant search
requests always ask for payloads and never ask for vectors.

## Logging and traceability

Retrieval logs use structured events such as `retrieval.query.received`,
`retrieval.embedding.started`, `retrieval.qdrant.search.completed`, `retrieval.results.mapped`,
`retrieval.query.completed`, and `retrieval.query.failed`. Logs include safe metadata such as
request ID, retrieval query ID, tenant ID, knowledge base ID, source IDs, file IDs, tag count, topK,
score threshold, result count, latency, embedding config ID, Qdrant collection ID, status, and error
code. Raw query vectors, chunk vectors, secrets, provider raw errors, stack traces, authorization
headers, cookies, and connection strings are not logged.

`RetrievalQuery` stores query execution metadata, a SHA-256 query hash, safe filters, latency,
result count, status, and safe errors. Query text is stored only when
`RETRIEVAL_STORE_QUERY_TEXT=true`. `RetrievalResult` stores result traceability references and
sanitized payload metadata when `RETRIEVAL_STORE_RESULTS=true`. PostgreSQL never stores embedding
vectors.

## Environment variables

```env
RETRIEVAL_DEFAULT_TOP_K=8
RETRIEVAL_MAX_TOP_K=30
RETRIEVAL_DEFAULT_SCORE_THRESHOLD=0
RETRIEVAL_TIMEOUT_MS=30000
RETRIEVAL_STORE_QUERY_TEXT=true
RETRIEVAL_STORE_RESULTS=true
RETRIEVAL_INCLUDE_TEXT_DEFAULT=true
RETRIEVAL_INCLUDE_METADATA_DEFAULT=true
```

`RETRIEVAL_DEFAULT_TOP_K` must be less than or equal to `RETRIEVAL_MAX_TOP_K`.

## Not Included

The retrieval module does not add authentication, authorization, users, roles, billing, frontend
code, chat UI, final AI answer generation, agents, tool calling, hybrid search, reranking, semantic
query caching, collection migration, or reprocessing.

## Related docs

- [Indexing pipeline](./indexing-pipeline.md) — chunking, embeddings, and Qdrant indexing
- [Validation and observability](./validation-and-observability.md) — structured logging
