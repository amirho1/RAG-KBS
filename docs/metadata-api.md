# Metadata API

The MVP metadata API manages the relational source of truth needed before ingestion, chunking,
embedding, vector indexing, and retrieval. These modules do not authenticate callers, store binary
content in PostgreSQL, run ingestion, or delete Qdrant vectors.

For file upload and storage configuration, see [Storage](./storage.md). For ingestion jobs and
worker parsing, see [Ingestion](./ingestion.md).

## Entity responsibilities

- `KnowledgeBase`: a tenant-scoped logical RAG knowledge base with a unique tenant slug, metadata,
  lifecycle status, and soft deletion.
- `Source`: a logical source inside a knowledge base, such as documentation, manuals, web pages, or
  uploaded document groups.
- `StorageObject`: metadata for the physical object stored in local, MinIO, S3, or compatible
  storage. It stores object references and checksums only.
- `DocumentFile`: a logical file attached to a source. It references a `StorageObject`, tracks file
  metadata and processing state, and prevents duplicate checksums inside one source.
- `Tag`: tenant-scoped searchable labels that can be attached to sources and files.

See [Data models](./models.md) for full entity descriptions.

## Endpoints

All metadata endpoints are versioned under `/api/v1`.

| Resource        | Endpoints                                                                                |
| --------------- | ---------------------------------------------------------------------------------------- |
| Knowledge bases | `POST /knowledge-bases`, `GET /knowledge-bases`, `GET/PATCH/DELETE /knowledge-bases/:id` |
| Sources         | `POST /sources`, `GET /sources`, `GET/PATCH/DELETE /sources/:id`                         |
| Storage upload  | `POST /storage/upload`                                                                   |
| Storage objects | `POST /storage-objects`, `GET /storage-objects`, `GET/PATCH/DELETE /storage-objects/:id` |
| Files           | `POST /files`, `GET /files`, `GET/PATCH/DELETE /files/:id`                               |
| Tags            | `POST /tags`, `GET /tags`, `GET/PATCH/DELETE /tags/:id`                                  |
| Tag assignments | `POST/DELETE /sources/:sourceId/tags/:tagId`, `POST/DELETE /files/:fileId/tags/:tagId`   |

Create endpoints accept `tenantId` in the request body. Read, list, update, delete, and tag
assignment endpoints require `tenantId` as a query parameter. Optional `organizationId` and
`projectId` query parameters can further filter list endpoints, but `tenantId` is the primary
isolation boundary.

## Tenant scoping and deletion

RAG-KBS trusts tenant IDs from upstream services, such as an API gateway or main backend. Every
normal read, list, update, and delete operation filters by `tenantId` and excludes records where
`deletedAt` is set. Cross-tenant reads return `404` instead of revealing whether another tenant's
record exists.

Deletes are soft deletes for knowledge bases, sources, files, and tags. Storage object deletion is
guarded: `DELETE /api/v1/storage-objects/:id` first checks that no active `DocumentFile` records
reference the object, deletes the physical local/S3 object, then sets `deletedAt`. It returns
`409 Conflict` while active files still reference the object. Qdrant vectors, parsed documents,
chunks, embeddings, and ingestion jobs are not deleted by the storage module.

## Tagging

Tag names are normalized before saving, and `normalizedName` is unique per tenant. Tag assignment
endpoints validate that both the target record and the tag belong to the same tenant. Duplicate
source/file tag assignments return `409 Conflict`, and missing assignments return `404`.

Source and file read/list responses include tag summaries for non-deleted tags. Future chunking and
vector indexing workers can copy these tag names into Qdrant payloads for metadata-filtered
retrieval.

## Example requests

Create a knowledge base:

```http
POST /api/v1/knowledge-bases
content-type: application/json

{
  "tenantId": "tenant_acme",
  "name": "API Documentation",
  "description": "Public API docs for retrieval.",
  "metadata": {
    "domain": "developer-docs"
  }
}
```

Create a source:

```http
POST /api/v1/sources
content-type: application/json

{
  "tenantId": "tenant_acme",
  "knowledgeBaseId": "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4",
  "name": "OpenAPI docs",
  "type": "OPENAPI",
  "description": "Uploaded API specification sources."
}
```

Create file metadata:

```http
POST /api/v1/files
content-type: application/json

{
  "tenantId": "tenant_acme",
  "sourceId": "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4",
  "storageObjectId": "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b",
  "originalName": "openapi.yaml",
  "mimeType": "application/yaml",
  "fileType": "OPENAPI",
  "sizeBytes": "2048",
  "checksumSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
```

Upload and store a file:

```bash
curl -X POST http://localhost:3000/api/v1/storage/upload \
  -F tenantId=tenant_acme \
  -F sourceId=f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4 \
  -F title="Product manual" \
  -F metadata='{"category":"manual","language":"en"}' \
  -F file=@./manual.txt\;type=text/plain
```

Example upload response:

```json
{
  "storageObject": {
    "id": "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b",
    "tenantId": "tenant_acme",
    "provider": "S3",
    "bucket": "rag-kbs-development",
    "objectKey": "tenants/tenant_acme/sources/f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4/year=2026/month=07/8b2f...-2cf24dba....txt",
    "originalName": "manual.txt",
    "mimeType": "text/plain",
    "sizeBytes": "5",
    "checksumSha256": "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
  },
  "file": {
    "id": "113d5fe3-927e-428d-9b55-557a6f776ed9",
    "tenantId": "tenant_acme",
    "sourceId": "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4",
    "storageObjectId": "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b",
    "status": "STORED",
    "processingState": "NOT_STARTED"
  }
}
```

The upload endpoint validates tenant/source fields, file size, empty files, filename length, MIME
type, and metadata shape. It calculates `checksumSha256` for every upload. Uploading the same
checksum into the same source returns `409 Conflict`; uploading the same bytes into another source
for the same tenant reuses the existing `StorageObject` when possible and creates a separate
`DocumentFile`.

Attach a tag:

```http
POST /api/v1/sources/f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4/tags/6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b?tenantId=tenant_acme
```

## Related docs

- [Storage](./storage.md) — upload MIME types, storage drivers, and worker file reads
- [Ingestion](./ingestion.md) — ingestion jobs and parsing lifecycle
