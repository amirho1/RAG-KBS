# Storage

File upload, object storage configuration, and worker file reads for ingestion.

## Upload MIME configuration

Allowed MIME types are configured with:

```env
MAX_UPLOAD_SIZE_MB=50
ALLOWED_UPLOAD_MIME_TYPES=application/pdf,text/plain,text/markdown,application/json,text/csv,text/html,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

See [Metadata API](./metadata-api.md) for upload endpoint examples and responses.

## Storage setup

Local storage:

```env
STORAGE_DRIVER=local
LOCAL_STORAGE_PATH=./storage
```

Docker local storage:

```env
STORAGE_DRIVER=local
LOCAL_STORAGE_PATH=/app/storage
```

The Compose files mount the same `local-storage` volume into API and worker containers at
`/app/storage`, so future workers can read the same files the API writes.

S3-compatible storage, including MinIO:

```env
STORAGE_DRIVER=s3
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_BUCKET=rag-kbs-development
S3_ACCESS_KEY_ID=rag-kbs-minio
S3_SECRET_ACCESS_KEY=rag-kbs-minio-password
S3_FORCE_PATH_STYLE=true
```

Production should use managed S3-compatible object storage when possible. Local storage in
production should be explicit, backed by durable shared storage, and avoided for horizontally scaled
API or worker deployments.

## Worker file reads

Ingestion workers inject `StorageService` and scope every read by `tenantId`:

```typescript
const stream = await this.storageService.getFileStream(storageObjectId, tenantId);

const buffer = await this.storageService.getFileBuffer(storageObjectId, tenantId);
```

Use streams for parsers that can stream input. Use `getFileBuffer` only for parsers that require the
entire file in memory.

The worker runs separately from the API:

```bash
pnpm start:worker:dev
pnpm start:worker
```

In Docker, the `worker` service starts `node dist/workers/ingestion.worker.js` in production and
writes `WORKER_READY_FILE` only after PostgreSQL, Redis, Qdrant, storage, and queue readiness checks
pass and the BullMQ worker has started.

## Related docs

- [Metadata API](./metadata-api.md) — storage upload and file metadata endpoints
- [Ingestion](./ingestion.md) — ingestion jobs and parsing lifecycle
