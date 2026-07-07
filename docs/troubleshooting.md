# Troubleshooting

- If a container waits forever, check `WAIT_FOR_HOSTS` and make sure each `host:port` is reachable
  from inside the Compose network.
- If Prisma cannot connect, confirm `DATABASE_URL` points at `postgres` inside Docker and
  `localhost` only outside Docker.
- If dev dependencies look stale, remove the named Node volume with
  `docker volume rm rag-kbs_node-modules` and rebuild.
- If production uses managed infrastructure, make sure the `self-hosted` profile is not enabled
  unless local PostgreSQL, Redis, Qdrant, or MinIO containers are actually needed.

## Related docs

- [Getting started](./getting-started.md) — local development setup
- [Production](./production.md) — managed services deployment
