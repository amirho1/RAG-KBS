# Explanation of the main entities

## `KnowledgeBase`

Represents a logical RAG knowledge base. One tenant can have multiple knowledge bases, such as one
for API documentation, one for policies, and one for customer-uploaded documents. It contains only
RAG-related metadata, not users, permissions, billing, or UI data.

## `Source`

Represents a logical source inside a knowledge base. A source can be an uploaded document group,
OpenAPI file, policy set, manual, web page, sitemap, or custom source. It has `checksumSha256` and
`contentHash` so the service can detect source changes and avoid unnecessary re-ingestion.

## `StorageObject`

Represents the actual stored file object in local storage, MinIO, S3, or another object storage
provider. This separates physical storage from logical file usage. The same binary file can be
reused by multiple `DocumentFile` records without duplicating object metadata.

## `DocumentFile`

Represents a file attached to a source. It links to `StorageObject`, keeps file metadata, tracks
ingestion state, and supports file version history through `previousFileId`. The unique constraint
on `[tenantId, sourceId, checksumSha256]` prevents re-uploading the same file into the same source.

## `Tag`, `SourceTag`, `FileTag`, `KnowledgeBaseTag`

These models support searchable metadata filtering. Tags should be copied into Qdrant payloads so
semantic search can filter by tags without round-tripping to PostgreSQL.

## `ParserProfile`

Stores parser configuration. This lets you use different parsing strategies for PDFs, Markdown,
OpenAPI files, Excel sheets, JSON files, or future document formats.

## `ParsedDocument`

Stores the extracted text and structure from a file. It can keep full extracted text in PostgreSQL,
or only a preview if the extracted text is too large. The important field is `contentHash`, which
allows the worker to skip chunking when the extracted content has not changed.

## `ChunkingConfig`

Stores chunking strategy settings such as chunk size, overlap, tokenizer, and structure-preserving
options. This is important because re-chunking must be traceable when you change chunking strategy
later.

## `DocumentChunk`

Represents the normalized text chunk used for retrieval. It keeps chunk position, page numbers,
heading paths, text preview, and `contentHash`. The `contentHash` is critical for preventing
duplicate embedding work.

## `ChunkKeywordIndex`

Prepares the schema for hybrid search. Prisma does not directly model PostgreSQL `tsvector` well, so
you can use this table for searchable text and add a raw SQL migration later for a GIN index.

## `EmbeddingModel`

Represents the embedding model itself, such as `text-embedding-3-large`, `bge-m3`, or a local model.
It stores provider, model name, vector dimension, and distance metric.

## `EmbeddingConfig`

Represents how the service uses an embedding model. This allows multiple configurations for the same
model, different chunking configs, different tenants, or different knowledge bases.

## `QdrantCollection`

Represents a Qdrant collection known by PostgreSQL. It tracks vector size, distance metric, status,
read/write defaults, aliases, and migration relationships. This makes collection migration and
embedding model upgrades manageable.

## `ChunkEmbedding`

Connects a PostgreSQL chunk to a Qdrant point. This is the main bridge between PostgreSQL and
Qdrant. It stores `qdrantPointId`, `qdrantCollectionId`, `embeddingConfigId`, `embeddedContentHash`,
and `payloadHash`.

## `VectorIndexOperation`

Tracks Qdrant operations such as point upserts, payload updates, point deletes, collection creation,
and migration. This gives you audit-friendly debugging when PostgreSQL and Qdrant fall out of sync.

## `IngestionJob`

Represents a BullMQ job at the database level. It includes job type, status, idempotency key, BullMQ
job ID, retry counters, selected parser/chunking/embedding config, and error metadata.

## `IngestionAttempt`

Represents each worker attempt for an ingestion job. This is important because one logical ingestion
job may fail twice and succeed on the third attempt.

## `ReprocessingBatch`

Represents bulk maintenance workflows such as re-ingesting a source, re-embedding all files with a
new model, rebuilding a keyword index, or migrating Qdrant collections.

## `ProcessingEvent`

Acts as an audit-friendly event log for processing. It does not represent application audit logs or
user activity logs. It only records RAG processing events.

## `RetrievalProfile`

Stores reusable retrieval settings: vector search, keyword search, hybrid search, reranking, topK,
candidateK, thresholds, and collection selection.

## `RetrievalQuery` and `RetrievalResult`

Track query execution and returned chunks. These models are useful for debugging retrieval quality,
latency, search filters, reranking performance, and future evaluation.

---

## 3. Ingestion lifecycle mapping

A normal ingestion flow works like this:

1. API creates or finds a `KnowledgeBase`.
2. API creates a `Source`.
3. API uploads the file to object storage and creates a `StorageObject`.
4. API creates a `DocumentFile`.
5. API creates an `IngestionJob` with a deterministic `idempotencyKey`.
6. API pushes the matching BullMQ job.
7. Worker creates an `IngestionAttempt`.
8. Worker parses the file and creates a `ParsedDocument`.
9. Worker chunks the parsed document and creates many `DocumentChunk` records.
10. Worker embeds chunks using `EmbeddingConfig` and `EmbeddingModel`.
11. Worker upserts vectors into Qdrant.
12. Worker creates `ChunkEmbedding` records with Qdrant point references.
13. Worker records `VectorIndexOperation` rows.
14. Worker updates `DocumentFile.status`, `Source.processingState`, and `IngestionJob.status`.
15. Worker writes `ProcessingEvent` records for debugging and processing history.

For re-ingestion, create a new `IngestionJob` with type `REINGEST_FILE` or `REINGEST_SOURCE`. The
worker should compare the new `contentHash` with the previous parsed document. If the content did
not change, it can skip parsing/chunking/embedding.

For re-embedding, create a `ReprocessingBatch` with type `REEMBED`, set `fromEmbeddingConfigId` and
`toEmbeddingConfigId`, then create child `IngestionJob` rows for affected files or chunks.

---

## 4. Qdrant integration notes

PostgreSQL should not store vector values. Qdrant stores vectors and payloads. PostgreSQL stores
traceability and lifecycle state.

Each Qdrant point should use a deterministic ID if possible, for example:

```txt
uuidv5(collectionId + chunkId + embeddingConfigId)
```

The Qdrant payload should include:

```ts
{
  tenantId,
  organizationId,
  projectId,
  knowledgeBaseId,
  sourceId,
  fileId,
  chunkId,
  chunkEmbeddingId,
  qdrantCollectionId,

  sourceType,
  fileType,
  mimeType,
  language,

  tags: ["policy", "api-docs"],

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
  updatedAt
}
```

The most important payload fields for Qdrant filtering are:

```txt
tenantId
organizationId
projectId
knowledgeBaseId
sourceId
fileId
chunkId
tags
fileType
mimeType
language
status
```

This lets you search a whole knowledge base, one source, selected files, selected tags, or
tenant-specific data safely.

For collection migration:

1. Create a new `QdrantCollection`.
2. Create a new `EmbeddingConfig`.
3. Create a `ReprocessingBatch` with reason `EMBEDDING_MODEL_CHANGED` or
   `QDRANT_COLLECTION_CHANGED`.
4. Generate new `ChunkEmbedding` rows into the new collection.
5. Verify retrieval quality.
6. Switch `isDefaultRead` and `isDefaultWrite`.
7. Mark the old collection as `DEPRECATED` or `READ_ONLY`.

---

## 5. MVP simplification suggestions

For the MVP, you can start with these models only:

```txt
KnowledgeBase
Source
StorageObject
DocumentFile
Tag
SourceTag
FileTag
ParsedDocument
ChunkingConfig
DocumentChunk
EmbeddingModel
EmbeddingConfig
QdrantCollection
ChunkEmbedding
IngestionJob
IngestionAttempt
RetrievalQuery
RetrievalResult
```

You can delay these until production:

```txt
KnowledgeBaseTag
ParserProfile
ChunkKeywordIndex
VectorIndexOperation
ReprocessingBatch
ProcessingEvent
RerankModel
RetrievalProfile
```

For the first version, you can also simplify:

- Use one default `EmbeddingModel`.
- Use one default `EmbeddingConfig`.
- Use one default `ChunkingConfig`.
- Use one Qdrant collection per environment or per tenant.
- Store only `textPreview` in PostgreSQL and full chunk text in Qdrant payload.
- Skip hybrid search until semantic retrieval works well.
- Skip reranking until you have retrieval quality issues.
- Keep `tenantId` required from day one, even in MVP.

---

## 6. Production-readiness checklist

Before production, add these implementation rules around the schema:

1. **Idempotency**

   - Generate deterministic `IngestionJob.idempotencyKey`.
   - Use `checksumSha256` for binary duplicate detection.
   - Use `contentHash` for parsed-text and chunk duplicate detection.
   - Use `embeddedContentHash` to skip unchanged embeddings.

2. **Qdrant consistency**

   - Always create `ChunkEmbedding` after successful Qdrant upsert.
   - Store `qdrantPointId` and `qdrantCollectionId`.
   - Use `VectorIndexOperation` for deletes and migration jobs.
   - Prefer Qdrant payload filters for deletion by `tenantId`, `sourceId`, or `fileId`.

3. **Soft deletion**

   - Mark source/file/chunk/vector records as deleting first.
   - Delete Qdrant points.
   - Then set `deletedAt`.
   - Avoid hard deletion until cleanup jobs verify vector deletion.

4. **Indexes that matter most**

   - `DocumentFile`: `[tenantId, sourceId, checksumSha256]`
   - `DocumentChunk`: `[fileId, status]`, `[sourceId, status]`, `[contentHash]`
   - `ChunkEmbedding`: `[qdrantCollectionId, qdrantPointId]`, `[chunkId, embeddingConfigId]`
   - `IngestionJob`: `[idempotencyKey]`, `[queueName, status]`, `[fileId, status]`
   - `RetrievalQuery`: `[knowledgeBaseId, createdAt]`, `[queryHash]`
   - `Tag`: `[tenantId, normalizedName]`

5. **Raw SQL migrations to consider**

   - Partial unique indexes for active records only, because Prisma does not model partial indexes
     cleanly.
   - GIN index for JSONB metadata if you filter heavily on metadata.
   - GIN/tsvector index for hybrid keyword search.
   - Case-insensitive unique indexes if you do not normalize names in application code.

6. **Operational safety**

   - Keep API and worker as separate NestJS processes.
   - Use BullMQ retries for temporary parser, embedding, Qdrant, or storage failures.
   - Store original files permanently unless retention policy says otherwise.
   - Keep old Qdrant collections during model upgrades until the new collection is verified.
   - Never rely on Qdrant as the source of truth for metadata; PostgreSQL remains the source of
     truth.
