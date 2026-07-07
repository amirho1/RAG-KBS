# RAG-KBS

RAG-KBS is a standalone backend-only framework for building retrieval-augmented generation knowledge
bases. It runs a NestJS HTTP API separately from the BullMQ ingestion worker so API traffic stays
isolated from file parsing, chunking, embedding, and vector indexing work.

## Documentation

- [Architecture](./docs/architect.md)
- [Data models](./docs/models.md)
- [System flowchart](./docs/flowchart.mmd)

## Stack

- TypeScript
- NestJS
- Prisma
- PostgreSQL
- Qdrant
- Redis
- BullMQ
- MinIO or S3-compatible storage
- Docker and Docker Compose
- Jest
- Zod

## Environment Files

Start from one of the example files and keep real secrets out of git:

```bash
cp .env.example .env
cp .env.development.example .env.development
cp .env.production.example .env.production
```

Docker Compose automatically loads `.env` from the project root. For production, pass an explicit
file when needed:

```bash
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Production values should come from a real secret store, deployment environment, or an untracked
`.env.production` file.

## Configuration

RAG-KBS validates all application environment variables at startup through a global
`AppConfigModule` (`src/config/`). Both the API and worker load the same validated config. If any
required variable is missing or invalid, the process exits immediately with a field-level error
message.

### How validation works

1. `@nestjs/config` loads env files in this order: `.env.{NODE_ENV}.local`, `.env.{NODE_ENV}`,
   `.env.local`, `.env`.
2. A Zod schema in `src/config/env.schema.ts` validates every required variable.
3. Typed namespaces (`app`, `database`, `redis`, `qdrant`, `storage`, `embedding`, `ingestion`,
   `logger`) are registered via `registerAs` and injected into services.

Do not read `process.env` directly in application code. Inject typed config instead:

```typescript
import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import redisConfig from "@/config/redis.config";

@Injectable()
export class ExampleQueueService {
  constructor(
    @Inject(redisConfig.KEY)
    private readonly redis: ConfigType<typeof redisConfig>
  ) {}

  getConnectionOptions() {
    return {
      host: this.redis.host,
      port: this.redis.port,
    };
  }
}
```

### Required variables

| Group     | Variable                                                                            | Notes                                      |
| --------- | ----------------------------------------------------------------------------------- | ------------------------------------------ |
| App       | `NODE_ENV`                                                                          | `development`, `test`, or `production`     |
| App       | `PORT`                                                                              | Positive integer                           |
| Database  | `DATABASE_URL`                                                                      | PostgreSQL connection string               |
| Database  | `DEFAULT_TENANT_ID`                                                                 | Seed tenant ID, defaults to `default`      |
| Redis     | `REDIS_HOST`                                                                        | Redis hostname                             |
| Redis     | `REDIS_PORT`                                                                        | Positive integer                           |
| Qdrant    | `QDRANT_URL`                                                                        | Qdrant HTTP URL                            |
| Qdrant    | `QDRANT_API_KEY`                                                                    | May be empty for local Qdrant without auth |
| Storage   | `STORAGE_DRIVER`                                                                    | `local` or `s3`                            |
| Storage   | `LOCAL_STORAGE_PATH`                                                                | Required when `STORAGE_DRIVER=local`       |
| Storage   | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Required when `STORAGE_DRIVER=s3`          |
| Storage   | `ALLOWED_UPLOAD_MIME_TYPES`                                                         | Comma-separated upload MIME allowlist      |
| Embedding | `EMBEDDING_PROVIDER`                                                                | Configurable provider name (not hardcoded) |
| Embedding | `EMBEDDING_MODEL`                                                                   | Model identifier for the provider          |
| Embedding | `EMBEDDING_DIMENSION`                                                               | Positive integer vector size               |
| Ingestion | `MAX_UPLOAD_SIZE_MB`                                                                | Positive integer upload limit              |
| Ingestion | `INGESTION_QUEUE_NAME`                                                              | BullMQ queue name                          |
| Ingestion | `INGESTION_CONCURRENCY`                                                             | Positive integer worker concurrency        |
| Ingestion | `INGESTION_MAX_ATTEMPTS`                                                            | Positive integer BullMQ retry limit        |
| Ingestion | `INGESTION_BACKOFF_DELAY_MS`                                                        | Positive integer retry backoff delay       |
| Ingestion | `INGESTION_REMOVE_ON_COMPLETE_COUNT`                                                | Completed BullMQ jobs to retain            |
| Ingestion | `INGESTION_REMOVE_ON_FAIL_COUNT`                                                    | Failed BullMQ jobs to retain               |
| Ingestion | `INGESTION_JOB_TIMEOUT_MS`                                                          | Worker-side processing timeout             |
| Ingestion | `INGESTION_MAX_TEXT_CONTENT_BYTES`                                                  | Max parsed text stored in PostgreSQL       |
| Ingestion | `INGESTION_TEXT_PREVIEW_LENGTH`                                                     | Parsed document preview length             |

Optional variables with defaults include `DEFAULT_TENANT_ID`, `REDIS_PASSWORD`, `REDIS_URL`,
`QDRANT_COLLECTION`, `EMBEDDING_API_KEY`, `BULLMQ_QUEUE_PREFIX`, `LOG_LEVEL`, `LOG_FORMAT`,
`LOG_DIR`, `LOG_ROTATION_ENABLED`, `LOG_RETENTION_DAYS`, `REQUEST_LOGGING_ENABLED`,
`REQUEST_BODY_LOGGING_ENABLED`, `S3_FORCE_PATH_STYLE`, and `WORKER_READY_FILE`.

### Logging variables

| Variable                       | Default | Description                               |
| ------------------------------ | ------- | ----------------------------------------- |
| `LOG_LEVEL`                    | `info`  | `fatal`, `error`, `warn`, `info`, `debug` |
| `LOG_FORMAT`                   | `json`  | Structured file log format                |
| `LOG_DIR`                      | `logs`  | Directory for application log files       |
| `LOG_ROTATION_ENABLED`         | `true`  | Write date-based log files                |
| `LOG_RETENTION_DAYS`           | `14`    | Delete rotated logs older than this       |
| `REQUEST_LOGGING_ENABLED`      | `true`  | Emit one structured log per HTTP request  |
| `REQUEST_BODY_LOGGING_ENABLED` | `false` | Log redacted request body summaries only  |

Production should use `LOG_FORMAT=json`. File logs are written as JSON lines so they remain easy to
ship to log processors.

### Development vs production

- **Development (Docker):** use `STORAGE_DRIVER=s3` with MinIO (`S3_ENDPOINT=http://minio:9000`
  inside Compose, `http://localhost:9000` from the host). Copy [`.env.example`](./.env.example) to
  `.env` before running `pnpm docker:dev`.
- **Production:** use `STORAGE_DRIVER=s3` and provide real S3-compatible credentials. When
  `STORAGE_DRIVER=s3`, all S3 variables must be non-empty.
- **`STORAGE_DRIVER=local`** remains valid for edge cases but is not the default. In Docker, set
  `LOCAL_STORAGE_PATH=/app/storage` so the API and worker share the mounted local storage volume.
- Numeric variables (`PORT`, `REDIS_PORT`, `EMBEDDING_DIMENSION`, `MAX_UPLOAD_SIZE_MB`, and all
  `INGESTION_*` numeric settings) are coerced from strings at startup.

See [`.env.example`](./.env.example) for the full list of application variables.

## Validation And Observability

The API configures shared runtime behavior in `configureApiApplication`. E2E tests use the same
helper as `src/main.ts`, so validation, error formatting, request IDs, and logging stay aligned.

### DTO validation

RAG-KBS uses `nestjs-zod` and Zod DTO classes for request validation. New DTO schemas should be
strict objects, which means unknown fields are rejected instead of silently accepted. Shared helpers
live under `src/common/dto/` for pagination, sorting, UUID params, tenant-aware fields, metadata
JSON, and enum validation.

Example valid request:

```http
POST /validation-fixture/f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4?page=2
x-request-id: external-request-123
content-type: application/json

{
  "name": "docs",
  "metadata": {
    "tags": ["rag"]
  }
}
```

Example validation response:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "field": "unknownField",
      "message": "Unknown field: unknownField"
    }
  ],
  "requestId": "req_0393dc53-d5d2-4bb0-917d-7398c0479bf2",
  "timestamp": "2026-07-04T00:00:00.000Z",
  "path": "/api/v1/sources"
}
```

Error responses include `requestId`, `timestamp`, and `path`. Production-style responses do not
include stack traces, raw provider errors, connection strings, or secrets.

### Request IDs and request logs

The API reads `x-request-id` when it is safe to propagate, otherwise it generates `req_<uuid>`.
Every response returns `x-request-id`, and services can read the active ID through
`RequestContextService`.

Each request log includes `event`, `requestId`, `method`, `path`, `statusCode`, `durationMs`,
`userAgent`, `ip`, `contentLength`, `serviceName`, and `environment`. Failed requests include a safe
error summary. Full request bodies are not logged by default.

All application logs are written inside `LOG_DIR`, which defaults to `logs`. With rotation enabled,
the logger writes daily files such as:

```txt
logs/app-2026-07-04.log
logs/error-2026-07-04.log
```

General logs are written to `app-YYYY-MM-DD.log`; error and fatal logs are written to
`error-YYYY-MM-DD.log`. Both API request logs and worker/job logs use the same logger and the same
redaction rules. Docker Compose mounts the shared `logs` volume at `/app/logs` for both API and
worker containers, so logs survive container restarts and image rebuilds.

### Job logs

`JobLoggerService` logs BullMQ lifecycle events: `job.started`, `job.completed`, `job.failed`,
`job.retrying`, `job.stalled`, and `job.cancelled`. Payloads include only job metadata that is
useful for ingestion debugging: job ID, queue name, job name, attempt counts, duration, tenant ID,
knowledge base ID, source ID, file ID, ingestion job ID, and safe error summaries.

Future ingestion processors should wrap work like this:

```typescript
const startedAt = Date.now();
await this.jobLogger.logStarted(job);

try {
  await this.processIngestionJob(job);
  await this.jobLogger.logCompleted(job, {
    durationMs: Date.now() - startedAt,
  });
} catch (error) {
  await this.jobLogger.logFailed(job, error, {
    durationMs: Date.now() - startedAt,
  });
  throw error;
}
```

Never log uploaded file content, raw document text, full chunk text, embeddings, API keys,
authorization headers, cookies, passwords, database URLs, object storage credentials, or raw
provider errors.

## Development

Run the full local development stack with hot reload:

```bash
pnpm docker:dev
```

This starts:

- API on `http://localhost:3000`
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Qdrant on `http://localhost:6333`
- MinIO API on `http://localhost:9000`
- MinIO console on `http://localhost:9001`

The API container runs `pnpm start:dev`. The worker container runs `pnpm worker:dev`. The whole
project directory is bind-mounted into both containers at `/app`, polling-based file watching is
enabled for reliable Docker Desktop hot reload, and `/app/node_modules` is kept in a named Docker
volume so host dependencies do not overwrite container dependencies. Nest writes development build
output to the bind-mounted `dist` directory so its watch compiler can remove and recreate output
normally during reloads.

## Development Migrations

Run Prisma development migrations manually:

```bash
pnpm docker:dev:migrate
```

This uses `prisma migrate dev`. It does not reset or wipe the database automatically. Avoid
`prisma db push` as the default migration path.

For local non-Docker workflows:

```bash
pnpm db:generate
pnpm db:migrate:dev
```

## Database And Prisma

Configure PostgreSQL with `DATABASE_URL`:

```env
DATABASE_URL=postgresql://rag_kbs:rag_kbs_password@localhost:5432/rag_kbs
```

Inside Docker Compose, use the `postgres` hostname instead of `localhost`:

```env
DATABASE_URL=postgresql://rag_kbs:rag_kbs_password@postgres:5432/rag_kbs
```

Generate the Prisma client after installing dependencies or changing the Prisma schema:

```bash
pnpm db:generate
```

Create and apply a development migration:

```bash
pnpm db:migrate:dev
```

Deploy existing migrations in production:

```bash
pnpm db:migrate:deploy
```

Production must use `prisma migrate deploy`, not `prisma migrate dev`. The production Docker Compose
file runs migrations through a separate one-shot `migrate` service before API and worker startup.

Seed safe default RAG configuration records:

```bash
pnpm db:seed
```

The seed inserts or updates a default chunking config, embedding model placeholder, embedding
config, and Qdrant collection config. It uses `DEFAULT_TENANT_ID` when provided and falls back to
`default`. It does not create users, roles, permissions, billing, or frontend data.

Open Prisma Studio:

```bash
pnpm db:studio
```

The API and worker both use the reusable `PrismaModule` and `PrismaService` from
`src/modules/database`. PostgreSQL remains the source of truth for RAG metadata, lifecycle state,
checksums, idempotency keys, chunk metadata, and Qdrant point references. Qdrant stores vectors and
search payloads only; vector values are not stored in PostgreSQL.

## Core Metadata Modules

The MVP metadata API manages the relational source of truth needed before ingestion, chunking,
embedding, vector indexing, and retrieval. These modules do not authenticate callers, store binary
content in PostgreSQL, run ingestion, or delete Qdrant vectors.

### Entity responsibilities

- `KnowledgeBase`: a tenant-scoped logical RAG knowledge base with a unique tenant slug, metadata,
  lifecycle status, and soft deletion.
- `Source`: a logical source inside a knowledge base, such as documentation, manuals, web pages, or
  uploaded document groups.
- `StorageObject`: metadata for the physical object stored in local, MinIO, S3, or compatible
  storage. It stores object references and checksums only.
- `DocumentFile`: a logical file attached to a source. It references a `StorageObject`, tracks file
  metadata and processing state, and prevents duplicate checksums inside one source.
- `Tag`: tenant-scoped searchable labels that can be attached to sources and files.

### Endpoints

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

### Tenant scoping and deletion

RAG-KBS trusts tenant IDs from upstream services, such as an API gateway or main backend. Every
normal read, list, update, and delete operation filters by `tenantId` and excludes records where
`deletedAt` is set. Cross-tenant reads return `404` instead of revealing whether another tenant's
record exists.

Deletes are soft deletes for knowledge bases, sources, files, and tags. Storage object deletion is
guarded: `DELETE /api/v1/storage-objects/:id` first checks that no active `DocumentFile` records
reference the object, deletes the physical local/S3 object, then sets `deletedAt`. It returns
`409 Conflict` while active files still reference the object. Qdrant vectors, parsed documents,
chunks, embeddings, and ingestion jobs are not deleted by the storage module.

### Tagging

Tag names are normalized before saving, and `normalizedName` is unique per tenant. Tag assignment
endpoints validate that both the target record and the tag belong to the same tenant. Duplicate
source/file tag assignments return `409 Conflict`, and missing assignments return `404`.

Source and file read/list responses include tag summaries for non-deleted tags. Future chunking and
vector indexing workers can copy these tag names into Qdrant payloads for metadata-filtered
retrieval.

### Ingestion

The ingestion module creates tenant-scoped database jobs and pushes minimal BullMQ payloads for the
worker. This first production milestone supports only `text/plain`, `text/markdown`, and
`text/x-markdown`. PDF, DOCX, CSV, JSON, chunking, embeddings, and Qdrant writes are intentionally
not part of this version.

Available endpoints:

```txt
POST /api/v1/files/:id/ingest
GET /api/v1/ingestion-jobs/:id?tenantId=tenant_acme
GET /api/v1/ingestion-jobs?tenantId=tenant_acme
POST /api/v1/ingestion-jobs/:id/retry?tenantId=tenant_acme
POST /api/v1/ingestion-jobs/:id/cancel?tenantId=tenant_acme
```

Retry and cancellation scope stays in query parameters so callers can retry or cancel a known job
without sending a JSON body. The query is still validated through dedicated ingestion DTOs.

Create an ingestion job:

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

Lifecycle:

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

The worker reads the stored object through `StorageService`, verifies that the BullMQ payload still
matches the database job scope, parses text or Markdown, normalizes text, calculates a SHA-256
`contentHash`, and stores a `ParsedDocument`. Full parsed text is stored in
`ParsedDocument.extractedText` only when it is below `INGESTION_MAX_TEXT_CONTENT_BYTES`; otherwise
the worker stores `textPreview` plus safe metadata.

Retry behavior is BullMQ-backed and config-driven. Retryable failures include storage reads,
database errors, queue errors, and temporary parser failures. Unsupported MIME types, missing files,
deleted files, and empty documents are treated as non-retryable. Cancellation is limited to
`PENDING` and `QUEUED` jobs; active processing is not interrupted in this version.

### Example requests

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

Allowed MIME types are configured with:

```env
MAX_UPLOAD_SIZE_MB=50
ALLOWED_UPLOAD_MIME_TYPES=application/pdf,text/plain,text/markdown,application/json,text/csv,text/html,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

### Storage setup

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

### Worker file reads

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

Attach a tag:

```http
POST /api/v1/sources/f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4/tags/6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b?tenantId=tenant_acme
```

## Production

Build and run the self-hosted production stack:

```bash
cp .env.production.example .env.production
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml --profile self-hosted up --build -d
```

Production includes a one-shot `migrate` service that runs:

```bash
pnpm db:migrate:deploy
```

The API and worker wait for the migration service to complete successfully before starting. The API
runs `node dist/main.js`; the worker runs `node dist/workers/ingestion.worker.js`.

## Managed Services

PostgreSQL, Redis, Qdrant, and object storage can be replaced with managed services by changing the
URLs and wait targets in the production environment:

```env
DATABASE_URL=postgresql://user:password@managed-postgres.example.com:5432/rag_kbs
REDIS_URL=rediss://managed-redis.example.com:6379
QDRANT_URL=https://managed-qdrant.example.com
S3_ENDPOINT=https://s3.amazonaws.com
MIGRATE_WAIT_FOR_HOSTS=managed-postgres.example.com:5432
API_WAIT_FOR_HOSTS=managed-postgres.example.com:5432,managed-redis.example.com:6379
WORKER_WAIT_FOR_HOSTS=managed-postgres.example.com:5432,managed-redis.example.com:6379
```

When all infrastructure is managed, omit the `self-hosted` profile.

## Health Checks

RAG-KBS exposes version-neutral health endpoints for liveness, readiness, and per-dependency
diagnostics. These endpoints verify that dependencies are actually usable, not only that containers
are running.

### Endpoints

| Endpoint               | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| `GET /health/live`     | Process liveness only (no dependency checks)          |
| `GET /health/ready`    | Readiness for all critical dependencies               |
| `GET /health`          | Overall summary with liveness and dependency statuses |
| `GET /health/postgres` | PostgreSQL connectivity via Prisma (`SELECT 1`)       |
| `GET /health/redis`    | Redis connectivity via `PING`                         |
| `GET /health/qdrant`   | Qdrant reachability via `/readyz`                     |
| `GET /health/storage`  | Local read/write or S3 bucket reachability            |
| `GET /health/queue`    | BullMQ ingestion queue metadata access                |

### Liveness vs readiness

- **Liveness** (`/health/live`) confirms the NestJS process is alive. It always returns `200` and
  does not contact PostgreSQL, Redis, Qdrant, storage, or queues.
- **Readiness** (`/health/ready`) checks all critical dependencies. It returns `200` only when every
  dependency is healthy and `503` when any dependency fails.

### Dependency checks

- **PostgreSQL**: lightweight `SELECT 1` through Prisma.
- **Redis**: shared Redis client `PING`.
- **Qdrant**: HTTP readiness probe against the configured Qdrant URL.
- **Storage**: local driver writes and reads a temporary file; S3 driver issues a `HeadBucket`
  request.
- **Queue**: BullMQ queue metadata lookup for the configured ingestion queue name and prefix. No
  jobs are enqueued.

### Docker Compose integration

- The API container **liveness** probe calls `GET /health/live` (Dockerfile `HEALTHCHECK`).
- The API container **readiness** probe in Compose calls `GET /health/ready`.
- The worker container health check still uses `WORKER_READY_FILE`, but the file is written only
  after programmatic readiness checks pass inside the worker process.
- The API and worker containers mount the `logs` Docker volume at `/app/logs` for persistent
  application, request, and BullMQ job logs.

### Example healthy response

`GET /health/live`:

```json
{
  "status": "ok",
  "service": "rag-kbs-api",
  "timestamp": "2026-07-04T00:00:00.000Z",
  "uptimeSeconds": 120
}
```

`GET /health/ready` when all dependencies are healthy:

```json
{
  "status": "ok",
  "dependencies": {
    "postgres": {
      "status": "ok",
      "dependency": "postgres",
      "latencyMs": 12,
      "timestamp": "2026-07-04T00:00:00.000Z"
    }
  },
  "timestamp": "2026-07-04T00:00:00.000Z"
}
```

### Example unhealthy response

`GET /health/postgres` when PostgreSQL is unavailable:

```json
{
  "status": "error",
  "dependency": "postgres",
  "message": "PostgreSQL health check failed",
  "timestamp": "2026-07-04T00:00:00.000Z"
}
```

Failed responses never include connection strings, credentials, or stack traces.

### Health timeout environment variables

| Variable                     | Default | Description              |
| ---------------------------- | ------- | ------------------------ |
| `POSTGRES_HEALTH_TIMEOUT_MS` | `2000`  | PostgreSQL check timeout |
| `REDIS_HEALTH_TIMEOUT_MS`    | `2000`  | Redis check timeout      |
| `QDRANT_HEALTH_TIMEOUT_MS`   | `3000`  | Qdrant check timeout     |
| `STORAGE_HEALTH_TIMEOUT_MS`  | `3000`  | Storage check timeout    |
| `QUEUE_HEALTH_TIMEOUT_MS`    | `2000`  | Queue check timeout      |

Optional application metadata:

| Variable       | Default         | Description                              |
| -------------- | --------------- | ---------------------------------------- |
| `SERVICE_NAME` | `rag-kbs-api`   | Service name in health responses         |
| `APP_VERSION`  | package version | Application version in `/health` summary |

## Useful Commands

```bash
pnpm test
pnpm lint
pnpm format
pnpm typecheck
pnpm db:generate
pnpm db:migrate:dev
pnpm db:migrate:deploy
pnpm db:seed
pnpm db:studio
```

Validate Compose files without starting containers:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml config
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile self-hosted config
```

Build production image targets:

```bash
docker build -f docker/Dockerfile --target api-runtime .
docker build -f docker/Dockerfile --target worker-runtime .
docker build -f docker/Dockerfile --target migrator .
```

## Troubleshooting

- If a container waits forever, check `WAIT_FOR_HOSTS` and make sure each `host:port` is reachable
  from inside the Compose network.
- If Prisma cannot connect, confirm `DATABASE_URL` points at `postgres` inside Docker and
  `localhost` only outside Docker.
- If dev dependencies look stale, remove the named Node volume with
  `docker volume rm rag-kbs_node-modules` and rebuild.
- If production uses managed infrastructure, make sure the `self-hosted` profile is not enabled
  unless local PostgreSQL, Redis, Qdrant, or MinIO containers are actually needed.
