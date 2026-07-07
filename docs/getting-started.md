# Getting Started

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
- LangChain
- OpenAI embeddings through `@langchain/openai`
- Qdrant SDK through `@qdrant/js-client-rest`
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

## Related docs

- [Configuration](./configuration.md) — environment variables and validation
- [Database](./database.md) — Prisma migrations and seeding
