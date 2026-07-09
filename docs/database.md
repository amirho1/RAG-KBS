# Database and Prisma

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

## PostgreSQL Setup

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

The indexing worker also auto-provisions the same default indexing records for the tenant being
processed. Run the seed when you want defaults created up front for `DEFAULT_TENANT_ID`; ingestion
does not require every request tenant to be pre-seeded.

Open Prisma Studio:

```bash
pnpm db:studio
```

The API and worker both use the reusable `PrismaModule` and `PrismaService` from
`src/modules/database`. PostgreSQL remains the source of truth for RAG metadata, lifecycle state,
checksums, idempotency keys, chunk metadata, and Qdrant point references. Qdrant stores vectors and
search payloads only; vector values are not stored in PostgreSQL.

## Related docs

- [Getting started](./getting-started.md) — local Docker development
- [Data models](./models.md) — entity reference
