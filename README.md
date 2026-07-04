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
3. Typed namespaces (`app`, `database`, `redis`, `qdrant`, `storage`, `embedding`, `ingestion`) are
   registered via `registerAs` and injected into services.

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
| Redis     | `REDIS_HOST`                                                                        | Redis hostname                             |
| Redis     | `REDIS_PORT`                                                                        | Positive integer                           |
| Qdrant    | `QDRANT_URL`                                                                        | Qdrant HTTP URL                            |
| Qdrant    | `QDRANT_API_KEY`                                                                    | May be empty for local Qdrant without auth |
| Storage   | `STORAGE_DRIVER`                                                                    | `local` or `s3`                            |
| Storage   | `LOCAL_STORAGE_PATH`                                                                | Required when `STORAGE_DRIVER=local`       |
| Storage   | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Required when `STORAGE_DRIVER=s3`          |
| Embedding | `EMBEDDING_PROVIDER`                                                                | Configurable provider name (not hardcoded) |
| Embedding | `EMBEDDING_MODEL`                                                                   | Model identifier for the provider          |
| Embedding | `EMBEDDING_DIMENSION`                                                               | Positive integer vector size               |
| Ingestion | `MAX_UPLOAD_SIZE_MB`                                                                | Positive integer upload limit              |
| Ingestion | `INGESTION_QUEUE_NAME`                                                              | BullMQ queue name                          |
| Ingestion | `INGESTION_CONCURRENCY`                                                             | Positive integer worker concurrency        |

Optional variables with defaults include `REDIS_PASSWORD`, `REDIS_URL`, `QDRANT_COLLECTION`,
`EMBEDDING_API_KEY`, `BULLMQ_QUEUE_PREFIX`, `LOG_LEVEL`, `S3_FORCE_PATH_STYLE`, and
`WORKER_READY_FILE`.

### Development vs production

- **Development (Docker):** use `STORAGE_DRIVER=s3` with MinIO (`S3_ENDPOINT=http://minio:9000`
  inside Compose, `http://localhost:9000` from the host). Copy [`.env.example`](./.env.example) to
  `.env` before running `pnpm docker:dev`.
- **Production:** use `STORAGE_DRIVER=s3` and provide real S3-compatible credentials. When
  `STORAGE_DRIVER=s3`, all S3 variables must be non-empty.
- **`STORAGE_DRIVER=local`** remains valid for edge cases but is not the default.
- Numeric variables (`PORT`, `REDIS_PORT`, `EMBEDDING_DIMENSION`, `MAX_UPLOAD_SIZE_MB`,
  `INGESTION_CONCURRENCY`) are coerced from strings at startup.

See [`.env.example`](./.env.example) for the full list of application variables.

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
pnpm prisma:generate
pnpm prisma:migrate:dev
```

## Production

Build and run the self-hosted production stack:

```bash
cp .env.production.example .env.production
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml --profile self-hosted up --build -d
```

Production includes a one-shot `migrate` service that runs:

```bash
pnpm prisma:migrate:deploy
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

The API exposes:

```txt
GET /health
```

The worker writes a readiness file at `WORKER_READY_FILE`, which defaults to
`/tmp/rag-kbs-worker.ready`. Docker uses that file for the worker health check until real BullMQ
worker health reporting is added.

## Useful Commands

```bash
pnpm test
pnpm lint
pnpm format
pnpm typecheck
pnpm prisma:studio
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
