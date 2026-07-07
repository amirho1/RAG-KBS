# Development Commands

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

## Related docs

- [Getting started](./getting-started.md) — local development setup
- [Troubleshooting](./troubleshooting.md) — common issues
