# RAG-KBS Architecture

## 1. Purpose

RAG-KBS is a standalone, backend-only Retrieval-Augmented Generation knowledge base service. It
manages file ingestion, metadata storage, document chunking, embeddings, vector indexing, and
knowledge retrieval through HTTP APIs.

The service focuses only on RAG-related operations. It does not handle authentication,
authorization, billing, user management, frontend UI, or business-specific workflows. External
services, such as an API gateway, auth service, or main application backend, must validate users and
permissions before calling RAG-KBS.

## 2. Core Technology Stack

RAG-KBS uses the following stack:

- **Backend Framework:** NestJS
- **Relational Database:** PostgreSQL
- **ORM:** Prisma
- **Vector Database:** Qdrant
- **Queue System:** BullMQ
- **Queue Backend:** Redis
- **Object/File Storage:** Local Docker volume for development, S3-compatible storage for production
- **Containerization:** Docker and Docker Compose
- **Embedding Provider:** Configurable embedding model provider
- **Document Processing:** Pluggable loaders/parsers for PDF, DOCX, TXT, Markdown, CSV, Excel, JSON,
  and other supported formats

## 3. High-Level Architecture

The system consists of the following main services:

1. **NestJS API Service**

   - Exposes HTTP APIs
   - Manages sources, files, metadata, tags, descriptions, ingestion requests, and query requests
   - Stores relational data in PostgreSQL through Prisma
   - Pushes ingestion jobs to BullMQ
   - Queries Qdrant for relevant chunks

2. **PostgreSQL Database**

   - Stores structured metadata
   - Stores source records, file records, tags, descriptions, ingestion status, chunk metadata,
     model configuration, and audit-friendly processing states
   - Does not store vector embeddings directly

3. **Qdrant Vector Database**

   - Stores embedded chunks
   - Supports semantic similarity search
   - Supports metadata filtering by source, file, tag, tenant, visibility, document type, and other
     fields

4. **BullMQ Worker Service**

   - Runs background ingestion jobs
   - Parses files
   - Splits documents into chunks
   - Generates embeddings
   - Stores vectors in Qdrant
   - Updates ingestion status in PostgreSQL

5. **Redis**

   - Powers BullMQ queues
   - Stores job states, retries, delays, and queue coordination data

6. **File Storage**

   - Stores original uploaded files
   - Keeps a durable copy of each file for reprocessing, re-embedding, debugging, and future model
     upgrades

## 4. Dockerized Deployment

All parts of the system must run inside Docker containers.

The development environment should include:

- `api` container for the NestJS HTTP service
- `worker` container for ingestion workers
- `postgres` container for relational data
- `qdrant` container for vector storage
- `redis` container for BullMQ
- Optional `minio` container for local S3-compatible file storage

Production should use the same containerized structure, but managed services can replace some
infrastructure components when needed. For example, managed PostgreSQL, managed Redis, managed
object storage, or a hosted Qdrant instance can replace local containers.

## 5. Service Boundaries

RAG-KBS should own only knowledge-base operations.

It should handle:

- Source CRUD
- File CRUD
- File metadata
- Tags and descriptions
- File ingestion
- Chunk creation
- Embedding generation
- Vector indexing
- Vector deletion
- Semantic retrieval
- Hybrid retrieval if added later
- Re-indexing and re-embedding
- Retrieval result formatting

It should not handle:

- Authentication
- Authorization
- User registration
- User roles
- Billing
- Chat UI
- Frontend pages
- Business workflows
- Domain-specific approval flows

External systems must call RAG-KBS with trusted requests.

## 6. Core Data Model

PostgreSQL should store the source of truth for structured data.

Recommended main entities:

### Source

Represents a logical knowledge source.

Examples:

- API documentation
- Company policy documents
- Hotel guide documents
- Admin panel manuals
- Uploaded user documents
- Swagger/OpenAPI files

Suggested fields:

- `id`
- `name`
- `description`
- `type`
- `status`
- `metadata`
- `createdAt`
- `updatedAt`

### File

Represents an uploaded or connected file.

Suggested fields:

- `id`
- `sourceId`
- `originalName`
- `mimeType`
- `size`
- `storagePath`
- `checksum`
- `status`
- `metadata`
- `createdAt`
- `updatedAt`

### Tag

Represents searchable labels for sources and files.

Suggested fields:

- `id`
- `name`
- `description`
- `createdAt`
- `updatedAt`

### Chunk

Represents a text chunk created from a file.

Suggested fields:

- `id`
- `fileId`
- `sourceId`
- `qdrantPointId`
- `contentHash`
- `chunkIndex`
- `textPreview`
- `tokenCount`
- `metadata`
- `createdAt`
- `updatedAt`

The full chunk text can either live in PostgreSQL or only inside Qdrant payloads. For better
debugging and traceability, PostgreSQL can store a preview while Qdrant stores the full searchable
chunk payload.

### IngestionJob

Represents the ingestion lifecycle.

Suggested fields:

- `id`
- `fileId`
- `sourceId`
- `status`
- `errorMessage`
- `startedAt`
- `finishedAt`
- `createdAt`
- `updatedAt`

### EmbeddingModel

Stores embedding model configuration.

Suggested fields:

- `id`
- `provider`
- `modelName`
- `dimension`
- `isActive`
- `metadata`
- `createdAt`
- `updatedAt`

This helps the system support model upgrades, re-embedding, and multiple embedding providers later.

## 7. Ingestion Flow

The ingestion process should run asynchronously through BullMQ.

Recommended flow:

1. Client uploads a file or creates a file record.
2. NestJS API stores file metadata in PostgreSQL.
3. NestJS API stores the original file in object storage.
4. NestJS API creates an ingestion job record.
5. NestJS API pushes a job to BullMQ.
6. BullMQ worker picks up the job.
7. Worker loads and parses the file.
8. Worker extracts clean text.
9. Worker splits the text into chunks.
10. Worker generates embeddings for each chunk.
11. Worker stores vectors and payload metadata in Qdrant.
12. Worker stores chunk metadata in PostgreSQL.
13. Worker updates file and ingestion job status.

## 8. Chunking Strategy

The system should use a configurable chunking strategy.

Recommended defaults:

- Chunk size: 500 to 1,000 tokens
- Chunk overlap: 50 to 150 tokens
- Preserve headings when possible
- Preserve document structure when possible
- Store page number, section title, source ID, file ID, and tag metadata
- Use different chunking strategies for different file types

For example:

- Policy documents need section-aware chunking
- API documentation needs endpoint-aware chunking
- Excel files need row/table-aware chunking
- JSON files need object/path-aware chunking

## 9. Embedding and Vector Storage

Qdrant stores vector embeddings and searchable payloads.

Each vector point should include:

- `sourceId`
- `fileId`
- `chunkId`
- `tags`
- `mimeType`
- `documentType`
- `chunkIndex`
- `text`
- `title`
- `description`
- `metadata`
- `createdAt`

This allows semantic search with metadata filtering.

The system should support:

- Single-source search
- Multi-source search
- Tag-filtered search
- File-filtered search
- Full knowledge-base search
- Future hybrid search

## 10. Query Flow

Recommended query flow:

1. Client sends a query request to the NestJS API.
2. API validates the request shape.
3. API applies metadata filters such as source IDs, file IDs, tags, or document types.
4. API embeds the user query.
5. API searches Qdrant.
6. API retrieves the most relevant chunks.
7. API optionally reranks results.
8. API returns structured results to the caller.

The service should return retrieval results, not necessarily a final AI answer. This keeps RAG-KBS
general-purpose and allows external AI agents or applications to decide how to use the retrieved
context.

## 11. API Design

The service should expose HTTP APIs under /api/v1/ such as:

### Sources

- `POST /sources`
- `GET /sources`
- `GET /sources/:id`
- `PATCH /sources/:id`
- `DELETE /sources/:id`

### Files

- `POST /files`
- `GET /files`
- `GET /files/:id`
- `PATCH /files/:id`
- `DELETE /files/:id`

### Ingestion

- `POST /files/:id/ingest`
- `GET /ingestion-jobs/:id`
- `POST /files/:id/reingest`

### Tags

- `POST /tags`
- `GET /tags`
- `PATCH /tags/:id`
- `DELETE /tags/:id`

### Retrieval

- `POST /query`
- `POST /query/similar`
- `POST /query/by-tags`
- `POST /query/by-source`

### Maintenance

- `POST /files/:id/reembed`
- `POST /sources/:id/reembed`
- `DELETE /files/:id/vectors`
- `GET /health`
- `GET /metrics`

## 12. Deletion and Consistency

When a file or source gets deleted, the system must delete both relational records and vector
records.

Recommended approach:

1. Mark the file or source as `deleting`.
2. Delete related Qdrant points using metadata filters.
3. Delete or soft-delete related PostgreSQL records.
4. Mark the deletion as complete.

Soft deletion is safer for production because it allows recovery, debugging, and delayed cleanup.

## 13. Idempotency

Ingestion should be idempotent.

The system should use file checksums and content hashes to avoid duplicate processing.

Recommended safeguards:

- Store file checksum
- Store chunk content hash
- Prevent duplicate ingestion jobs for the same file
- Replace old vectors during re-ingestion
- Use deterministic Qdrant point IDs when possible
- Support safe retries in BullMQ

## 14. Error Handling and Retries

BullMQ should handle retries for temporary failures.

Examples:

- Embedding provider timeout
- File parser failure
- Qdrant connection issue
- Database transaction failure
- Redis connection issue

Recommended job states:

- `pending`
- `processing`
- `completed`
- `failed`
- `retrying`
- `cancelled`

Failed ingestion jobs should store error messages in PostgreSQL for debugging.

## 15. Observability

The system should include observability from the beginning.

Recommended features:

- Structured logs
- Request IDs
- Job IDs
- Health checks
- Queue status monitoring
- Ingestion duration tracking
- File processing metrics
- Embedding usage metrics
- Qdrant search latency
- PostgreSQL query performance tracking

Useful endpoints:

- `GET /health`
- `GET /health/postgres`
- `GET /health/qdrant`
- `GET /health/redis`
- `GET /metrics`

## 16. Security Assumptions

RAG-KBS receives trusted requests from upstream services.

However, it should still protect itself by applying:

- Request validation
- File type validation
- File size limits
- Rate limits at the gateway level
- Malware scanning if needed
- Safe file parsing
- Environment-based secrets
- No public direct access to PostgreSQL, Redis, or Qdrant

Authentication and authorization should remain outside this service.

## 17. Scalability

The architecture should scale horizontally.

Recommended scaling strategy:

- Scale NestJS API containers for more HTTP traffic
- Scale BullMQ worker containers for more ingestion throughput
- Scale PostgreSQL vertically or with managed database features
- Scale Qdrant based on vector volume and search traffic
- Use object storage for durable file storage
- Use queue concurrency limits to protect embedding providers and databases

The API service and worker service should be separated so that heavy ingestion tasks do not block
query traffic.

## 18. Re-Embedding and Model Upgrades

The system should support embedding model upgrades.

When the embedding model changes, the service should be able to:

- Create a new embedding model record
- Reprocess selected sources or files
- Store vectors in a new Qdrant collection if needed
- Gradually migrate traffic to the new collection
- Keep old vectors until the new index is verified

This avoids dangerous full-database migrations during model changes.

## 19. Multi-Tenancy Support

If multiple applications, teams, or clients use the service, RAG-KBS should support tenant-aware
metadata.

Recommended fields:

- `tenantId`
- `organizationId`
- `projectId`

These fields should exist in PostgreSQL and Qdrant payloads. Even if authorization happens outside
the service, RAG-KBS still needs tenant-aware filtering to avoid mixing knowledge between clients.

## 20. Recommended Folder Structure

```txt
src/
  modules/
    sources/
    files/
    tags/
    ingestion/
    chunks/
    embeddings/
    retrieval/
    qdrant/
    storage/
    health/
    config/
  workers/
    ingestion.worker.ts
  common/
    dto/
    filters/
    interceptors/
    logger/
    utils/
prisma/
  schema.prisma
docker/
  Dockerfile.api
  Dockerfile.worker
docker-compose.yml
```

## 21. Recommended Docker Compose Services

```txt
services:
  api:
    NestJS HTTP API

  worker:
    BullMQ ingestion worker

  postgres:
    Relational database

  redis:
    Queue backend

  qdrant:
    Vector database

  minio:
    Optional local S3-compatible storage
```

## 22. Future Enhancements

The system can later add:

- Hybrid search using keyword search plus vector search
- Reranking
- Document-level permissions through metadata filters
- OpenAPI/Swagger ingestion
- Automatic API tool generation from OpenAPI files
- Webhook callbacks after ingestion completion
- Batch ingestion
- Scheduled re-indexing
- Admin dashboard as a separate application
- Evaluation datasets for retrieval quality
- Retrieval quality scoring
- Versioned knowledge bases
- Snapshot and restore tools

## 23. Final Architecture Summary

RAG-KBS should run as a Dockerized, standalone RAG microservice built with NestJS. It should use
PostgreSQL with Prisma for relational metadata, Qdrant for embedded chunks, BullMQ with Redis for
asynchronous ingestion, and object storage for original files.

The system should keep the API service lightweight, move heavy ingestion into background workers,
store structured metadata in PostgreSQL, store semantic vectors in Qdrant, and expose clean HTTP
APIs for external applications and AI agents.

This architecture keeps the service focused, scalable, maintainable, and reusable across different
products.
