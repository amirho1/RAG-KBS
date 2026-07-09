# Validation and Observability

The API configures shared runtime behavior in `configureApiApplication`. E2E tests use the same
helper as `src/main.ts`, so validation, error formatting, request IDs, and logging stay aligned.

## DTO validation

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

## Request IDs and request logs

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
redaction rules. In development Docker Compose, the project bind mount maps `/app/logs` to local
`./logs`, so those files update live on the host. In production Compose, API and worker containers
mount the shared `logs` Docker volume at `/app/logs`, so logs survive container restarts and image
rebuilds.

## Job logs

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

## Related docs

- [Configuration](./configuration.md) — logging environment variables
- [Ingestion](./ingestion.md) — BullMQ job lifecycle
