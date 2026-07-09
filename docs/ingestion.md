# Ingestion

The ingestion module creates tenant-scoped database jobs and pushes minimal BullMQ payloads for the
worker. This first production milestone supports only `text/plain`, `text/markdown`, and
`text/x-markdown`. PDF, DOCX, CSV, JSON, chunking, embeddings, and Qdrant writes are intentionally
not part of this version.

After parsing completes, the worker continues into the [indexing pipeline](./indexing-pipeline.md)
for chunking, embedding, and Qdrant indexing.

## Endpoints

```txt
POST /api/v1/files/:id/ingest
GET /api/v1/ingestion-jobs/:id?tenantId=tenant_acme
GET /api/v1/ingestion-jobs?tenantId=tenant_acme
POST /api/v1/ingestion-jobs/:id/retry?tenantId=tenant_acme
POST /api/v1/ingestion-jobs/:id/cancel?tenantId=tenant_acme
```

Retry and cancellation scope stays in query parameters so callers can retry or cancel a known job
without sending a JSON body. The query is still validated through dedicated ingestion DTOs.

## Create an ingestion job

```http
POST /api/v1/files/113d5fe3-927e-428d-9b55-557a6f776ed9/ingest
content-type: application/json

{
  "tenantId": "tenant_acme",
  "force": false,
  "reason": "INITIAL_INGESTION",
  "metadata": {
    "requestedBy": "api-gateway"
  }
}
```

## Lifecycle

```txt
PENDING -> QUEUED -> PROCESSING -> COMPLETED
                         └──────-> RETRYING -> PROCESSING
                         └──────-> FAILED
PENDING/QUEUED -> CANCELLED
PROCESSING -> SKIPPED when parsed content is unchanged and force=false
```

The API validates tenant scope, deleted files, storage object presence, supported MIME types,
duplicate active jobs, and deterministic idempotency before queueing work. If any active job exists
for the same tenant/file, the API returns that job. This is also protected by a partial PostgreSQL
unique index for active ingestion statuses. If a completed unchanged job exists and `force=false`,
the API returns the completed job instead of enqueueing duplicate work. `force=true` creates a
`REINGEST_FILE` job while still preventing duplicate active work.

Job responses include only safe job metadata. Sensitive metadata keys such as API keys, tokens,
passwords, raw text, document content, embeddings, and request bodies are redacted before leaving
the service.

## Worker behavior

The worker reads the stored object through `StorageService`, verifies that the BullMQ payload still
matches the database job scope, parses text or Markdown, normalizes text, calculates a SHA-256
`contentHash`, and stores a `ParsedDocument`. Before indexing, it idempotently ensures default
chunking, embedding, and Qdrant metadata exists for the job's `tenantId`. Full parsed text is stored
in `ParsedDocument.extractedText` only when it is below `INGESTION_MAX_TEXT_CONTENT_BYTES`;
otherwise the worker stores `textPreview` plus safe metadata.

Retry behavior is BullMQ-backed and config-driven. Retryable failures include storage reads,
database errors, queue errors, and temporary parser failures. Unsupported MIME types, missing files,
deleted files, and empty documents are treated as non-retryable. Cancellation is limited to
`PENDING` and `QUEUED` jobs; active processing is not interrupted in this version.

## Related docs

- [Storage](./storage.md) — file upload and worker file reads
- [Indexing pipeline](./indexing-pipeline.md) — chunking, embeddings, and Qdrant indexing
