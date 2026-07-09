# Indexing Pipeline

The indexing pipeline adds the first end-to-end indexing path after a document has been parsed. The
worker continues past `ParsedDocument` creation and runs:

```txt
ParsedDocument -> DocumentChunk metadata -> embeddings -> Qdrant points -> ChunkEmbedding metadata
```

The modules are intentionally focused:

- `ChunkingModule`: loads the default chunking config and uses LangChain recursive text splitting
  with Markdown heading and paragraph-aware separators.
- `EmbeddingsModule`: owns the provider abstraction, deterministic local dummy provider, and
  `LangChainOpenAiService` using `ChatOpenAI` and `OpenAIEmbeddings` from `@langchain/openai`.
- `QdrantModule`: owns `QdrantClient` from `@qdrant/js-client-rest` and exposes collection ensure,
  point upsert, point delete, filter delete, and health operations.
- `ChunksModule`: exposes safe read-only chunk debugging endpoints.

## Defaults

The idempotent seed and indexing runtime both ensure these tenant-scoped defaults exist:

- `Default Recursive Text Chunking`: `RECURSIVE_TEXT`, size `800`, overlap `120`, tokenizer
  `APPROXIMATE`, headings and paragraphs preserved.
- `Default Embedding Config`: connects the default chunking config to the configured embedding
  model.
- Default Qdrant collection metadata using `QDRANT_COLLECTION_NAME`, vector size, and distance
  metric.

When ingestion indexes a document, the worker auto-provisions the same default bundle for the
document's `tenantId` before loading chunking, embedding, or Qdrant metadata. This keeps arbitrary
tenant IDs from depending on a prior `DEFAULT_TENANT_ID` seed run.

## Qdrant Payloads

PostgreSQL stores chunk metadata, previews, hashes, statuses, and Qdrant point references. Full
chunk text and vectors are not stored in PostgreSQL. Qdrant payloads include full text plus safe
filter metadata:

```ts
{
  (tenantId,
    knowledgeBaseId,
    sourceId,
    fileId,
    parsedDocumentId,
    chunkId,
    chunkEmbeddingId,
    qdrantCollectionId,
    sourceType,
    fileType,
    mimeType,
    language,
    tags,
    title,
    description,
    chunkIndex,
    pageStart,
    pageEnd,
    headingPath,
    text,
    textPreview,
    contentHash,
    embeddedContentHash,
    createdAt,
    updatedAt);
}
```

## Debug Endpoints

These endpoints require tenant scoping and never return full chunk text or vector values:

```http
GET /api/v1/chunks
GET /api/v1/chunks/:id
GET /api/v1/files/:fileId/chunks
GET /api/v1/chunks/:id/embedding
```

## Environment Variables

The indexing pipeline uses these variables:

```env
CHUNKING_DEFAULT_SIZE=800
CHUNKING_DEFAULT_OVERLAP=120
CHUNKING_TEXT_PREVIEW_LENGTH=1000
CHUNKING_MAX_CHUNKS_PER_DOCUMENT=10000

EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=openai/text-embedding-3-small
EMBEDDING_DIMENSION=1536
EMBEDDING_DISTANCE_METRIC=Cosine
EMBEDDING_BATCH_SIZE=64
EMBEDDING_TIMEOUT_MS=30000
EMBEDDING_MAX_RETRIES=3
OPENAI_API_KEY=
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_CHAT_MODEL=deepseek/deepseek-v4-flash

QDRANT_COLLECTION_NAME=rag_kbs_default
QDRANT_VECTOR_SIZE=1536
QDRANT_DISTANCE_METRIC=Cosine
QDRANT_UPSERT_BATCH_SIZE=64
QDRANT_TIMEOUT_MS=30000
```

`EMBEDDING_API_KEY` and `QDRANT_COLLECTION` remain backward-compatible aliases. Prefer
`OPENAI_API_KEY` and `QDRANT_COLLECTION_NAME` for new deployments.

By default, `OPENAI_BASE_URL` points to OpenRouter (`https://openrouter.ai/api/v1`). Use
OpenRouter-style model slugs such as `openai/text-embedding-3-small` for `EMBEDDING_MODEL` and
`deepseek/deepseek-v4-flash` for `OPENAI_CHAT_MODEL`. Set
`OPENAI_BASE_URL=https://api.openai.com/v1` to call OpenAI directly.

## Not Included

This pipeline does not add authentication, authorization, users, roles, billing, frontend code, chat
UI, retrieval endpoints, hybrid search, reranking, collection migration, or reprocessing.

## Related docs

- [Ingestion](./ingestion.md) — parsing and ingestion job lifecycle
- [Retrieval](./retrieval.md) — semantic search over indexed chunks
