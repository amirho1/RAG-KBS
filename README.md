# RAG-KBS

RAG-KBS is a standalone backend-only framework for building retrieval-augmented generation knowledge
bases. It runs a NestJS HTTP API separately from the BullMQ ingestion worker so API traffic stays
isolated from file parsing, chunking, embedding, and vector indexing work.

## Quick start

```bash
cp .env.example .env
pnpm docker:dev
```

The API starts at `http://localhost:3000`.

## Documentation

Full documentation lives in [docs/README.md](./docs/README.md).

- [Architecture](./docs/architect.md)
- [Data models](./docs/models.md)
- [System flowchart](./docs/flowchart.mmd)
