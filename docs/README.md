# RAG-KBS Documentation

RAG-KBS is a standalone backend-only framework for building retrieval-augmented generation knowledge
bases. Use this index to navigate the documentation.

## Overview

- [Architecture](./architect.md) — system design, services, and data flow
- [Data models](./models.md) — Prisma entities and relationships
- [System flowchart](./flowchart.mmd) — high-level process diagram

## Setup and development

- [Getting started](./getting-started.md) — stack, environment files, and local Docker development
- [Configuration](./configuration.md) — environment variable validation and defaults
- [Database](./database.md) — Prisma migrations, seeding, and PostgreSQL setup
- [Development commands](./development.md) — test, lint, build, and Docker commands
- [Troubleshooting](./troubleshooting.md) — common local and deployment issues

## API modules

Follow the RAG workflow in order:

1. [Metadata API](./metadata-api.md) — knowledge bases, sources, files, and tags
2. [Storage](./storage.md) — file upload, object storage, and worker file reads
3. [Ingestion](./ingestion.md) — ingestion jobs, lifecycle, and parsing
4. [Indexing pipeline](./indexing-pipeline.md) — chunking, embeddings, and Qdrant indexing
5. [Retrieval](./retrieval.md) — semantic search and query traceability

## Operations

- [Validation and observability](./validation-and-observability.md) — DTO validation, request IDs, and logging
- [Production](./production.md) — production deployment and managed services
- [Health checks](./health-checks.md) — liveness, readiness, and dependency probes
