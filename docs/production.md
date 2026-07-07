# Production

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

## Related docs

- [Configuration](./configuration.md) — environment variables
- [Health checks](./health-checks.md) — deployment probes
