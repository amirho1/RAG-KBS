# Health Checks

RAG-KBS exposes version-neutral health endpoints for liveness, readiness, and per-dependency
diagnostics. These endpoints verify that dependencies are actually usable, not only that containers
are running.

## Endpoints

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

## Liveness vs readiness

- **Liveness** (`/health/live`) confirms the NestJS process is alive. It always returns `200` and
  does not contact PostgreSQL, Redis, Qdrant, storage, or queues.
- **Readiness** (`/health/ready`) checks all critical dependencies. It returns `200` only when every
  dependency is healthy and `503` when any dependency fails.

## Dependency checks

- **PostgreSQL**: lightweight `SELECT 1` through Prisma.
- **Redis**: shared Redis client `PING`.
- **Qdrant**: HTTP readiness probe against the configured Qdrant URL.
- **Storage**: local driver writes and reads a temporary file; S3 driver issues a `HeadBucket`
  request.
- **Queue**: BullMQ queue metadata lookup for the configured ingestion queue name and prefix. No
  jobs are enqueued.

## Docker Compose integration

- The API container **liveness** probe calls `GET /health/live` (Dockerfile `HEALTHCHECK`).
- The API container **readiness** probe in Compose calls `GET /health/ready`.
- The worker container health check still uses `WORKER_READY_FILE`, but the file is written only
  after programmatic readiness checks pass inside the worker process.
- The API and worker containers mount the `logs` Docker volume at `/app/logs` for persistent
  application, request, and BullMQ job logs.

## Example healthy response

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

## Example unhealthy response

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

## Health timeout environment variables

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

## Related docs

- [Production](./production.md) — deployment setup
- [Getting started](./getting-started.md) — local Docker development
