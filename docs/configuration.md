# Configuration

RAG-KBS validates all application environment variables at startup through a global
`AppConfigModule` (`src/config/`). Both the API and worker load the same validated config. If any
required variable is missing or invalid, the process exits immediately with a field-level error
message.

## How validation works

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

## Required variables

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
| Qdrant    | `QDRANT_COLLECTION_NAME`                                                            | Default Qdrant collection name             |
| Qdrant    | `QDRANT_VECTOR_SIZE`                                                                | Must match embedding dimension             |
| Qdrant    | `QDRANT_DISTANCE_METRIC`                                                            | `Cosine`, `Dot`, `Euclid`, or `Manhattan`  |
| Storage   | `STORAGE_DRIVER`                                                                    | `local` or `s3`                            |
| Storage   | `LOCAL_STORAGE_PATH`                                                                | Required when `STORAGE_DRIVER=local`       |
| Storage   | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Required when `STORAGE_DRIVER=s3`          |
| Storage   | `ALLOWED_UPLOAD_MIME_TYPES`                                                         | Comma-separated upload MIME allowlist      |
| Embedding | `EMBEDDING_PROVIDER`                                                                | Configurable provider name (not hardcoded) |
| Embedding | `EMBEDDING_MODEL`                                                                   | Model identifier for the provider          |
| Embedding | `EMBEDDING_DIMENSION`                                                               | Positive integer vector size               |
| Embedding | `OPENAI_API_KEY`                                                                    | Required when provider is `openai`         |
| Chunking  | `CHUNKING_DEFAULT_SIZE`                                                             | Default chunk token target                 |
| Chunking  | `CHUNKING_DEFAULT_OVERLAP`                                                          | Default chunk overlap                      |
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
`QDRANT_COLLECTION`, `QDRANT_UPSERT_BATCH_SIZE`, `QDRANT_TIMEOUT_MS`, `EMBEDDING_API_KEY`,
`EMBEDDING_BATCH_SIZE`, `EMBEDDING_TIMEOUT_MS`, `EMBEDDING_MAX_RETRIES`, `OPENAI_CHAT_MODEL`,
`CHUNKING_TEXT_PREVIEW_LENGTH`, `CHUNKING_MAX_CHUNKS_PER_DOCUMENT`, `RETRIEVAL_DEFAULT_TOP_K`,
`RETRIEVAL_MAX_TOP_K`, `RETRIEVAL_DEFAULT_SCORE_THRESHOLD`, `RETRIEVAL_TIMEOUT_MS`,
`RETRIEVAL_STORE_QUERY_TEXT`, `RETRIEVAL_STORE_RESULTS`, `RETRIEVAL_INCLUDE_TEXT_DEFAULT`,
`RETRIEVAL_INCLUDE_METADATA_DEFAULT`, `BULLMQ_QUEUE_PREFIX`, `LOG_LEVEL`, `LOG_FORMAT`, `LOG_DIR`,
`LOG_ROTATION_ENABLED`, `LOG_RETENTION_DAYS`, `REQUEST_LOGGING_ENABLED`,
`REQUEST_BODY_LOGGING_ENABLED`, `S3_FORCE_PATH_STYLE`, and `WORKER_READY_FILE`.

## Logging variables

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

## Development vs production

- **Development (Docker):** use `STORAGE_DRIVER=s3` with MinIO (`S3_ENDPOINT=http://minio:9000`
  inside Compose, `http://localhost:9000` from the host). Copy [`.env.example`](../.env.example) to
  `.env` before running `pnpm docker:dev`.
- **Production:** use `STORAGE_DRIVER=s3` and provide real S3-compatible credentials. When
  `STORAGE_DRIVER=s3`, all S3 variables must be non-empty.
- **`STORAGE_DRIVER=local`** remains valid for edge cases but is not the default. In Docker, set
  `LOCAL_STORAGE_PATH=/app/storage` so the API and worker share the mounted local storage volume.
- Numeric variables (`PORT`, `REDIS_PORT`, `EMBEDDING_DIMENSION`, `MAX_UPLOAD_SIZE_MB`, and all
  `INGESTION_*` numeric settings) are coerced from strings at startup.

See [`.env.example`](../.env.example) for the full list of application variables.

## Related docs

- [Getting started](./getting-started.md) — local development setup
- [Validation and observability](./validation-and-observability.md) — logging and request tracing
