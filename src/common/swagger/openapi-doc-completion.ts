import type { OpenAPIObject } from "@nestjs/swagger";

type OpenApiJson =
  | string
  | number
  | boolean
  | null
  | OpenApiJson[]
  | { [key: string]: OpenApiJson };

type OpenApiSchema = {
  $ref?: string;
  type?: string;
  format?: string;
  description?: string;
  example?: OpenApiJson;
  enum?: readonly string[];
  nullable?: boolean;
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  required?: string[];
  additionalProperties?: boolean | OpenApiSchema;
  oneOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  allOf?: OpenApiSchema[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
};

type OpenApiExample = {
  summary?: string;
  description?: string;
  value: unknown;
};

type OpenApiContent = {
  schema?: OpenApiSchema;
  example?: unknown;
  examples?: Record<string, OpenApiExample>;
};

type OpenApiResponse = {
  description?: string;
  content?: Record<string, OpenApiContent>;
};

type OpenApiRequestBody = {
  description?: string;
  required?: boolean;
  content?: Record<string, OpenApiContent>;
};

type OpenApiParameter = {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  example?: unknown;
  examples?: Record<string, OpenApiExample>;
  schema?: OpenApiSchema;
};

type OpenApiOperation = {
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses?: Record<string, OpenApiResponse>;
};

type OpenApiPathItem = {
  get?: OpenApiOperation;
  post?: OpenApiOperation;
  put?: OpenApiOperation;
  patch?: OpenApiOperation;
  delete?: OpenApiOperation;
};

type MutableOpenApiDocument = OpenAPIObject & {
  paths: Record<string, OpenApiPathItem>;
  components: NonNullable<OpenAPIObject["components"]> & {
    schemas: Record<string, OpenApiSchema>;
  };
};

type PropertyDocumentation = {
  description: string;
  example?: OpenApiJson;
  format?: string;
};

type OperationDocumentation = {
  summary?: string;
  description?: string;
};

type ResponseDocumentation = {
  description: string;
  schema: OpenApiSchema;
  example: unknown;
  contentType?: string;
};

type RequestBodyDocumentation = {
  description: string;
  examples: Record<string, OpenApiExample>;
};

const jsonContentType = "application/json";
const textContentType = "text/plain";

const knowledgeBaseStatusValues = [
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
  "DELETING",
  "DELETED",
] as const;
const lifecycleStatusValues = [
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
  "DELETING",
  "DELETED",
] as const;
const processingStateValues = [
  "NOT_STARTED",
  "QUEUED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "RETRYING",
  "CANCELLED",
  "SKIPPED",
] as const;
const sourceTypeValues = [
  "UPLOAD",
  "URL",
  "WEB_PAGE",
  "SITEMAP",
  "API_DOCUMENTATION",
  "OPENAPI",
  "SWAGGER",
  "MARKDOWN",
  "TEXT",
  "POLICY",
  "MANUAL",
  "FAQ",
  "DATABASE_EXPORT",
  "CUSTOM",
] as const;
const sourceSyncModeValues = [
  "MANUAL",
  "SCHEDULED",
  "WEBHOOK",
  "API_PUSH",
] as const;
const documentFileTypeValues = [
  "PDF",
  "DOCX",
  "TXT",
  "MARKDOWN",
  "HTML",
  "CSV",
  "XLSX",
  "JSON",
  "XML",
  "IMAGE",
  "AUDIO",
  "VIDEO",
  "OPENAPI",
  "UNKNOWN",
] as const;
const fileStatusValues = [
  "UPLOADED",
  "STORED",
  "WAITING_FOR_INGESTION",
  "INGESTING",
  "INGESTED",
  "PARTIALLY_INGESTED",
  "FAILED",
  "NEEDS_REINGESTION",
  "NEEDS_REEMBEDDING",
  "DELETING",
  "DELETED",
] as const;
const storageProviderValues = [
  "LOCAL",
  "S3",
  "MINIO",
  "GCS",
  "AZURE_BLOB",
  "CUSTOM",
] as const;
const ingestionJobTypeValues = ["INGEST_FILE", "REINGEST_FILE"] as const;
const ingestionJobStatusValues = [
  "PENDING",
  "QUEUED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "RETRYING",
  "CANCELLED",
  "SKIPPED",
] as const;
const attemptStatusValues = [
  "STARTED",
  "COMPLETED",
  "FAILED",
  "RETRYING",
  "CANCELLED",
] as const;
const chunkStatusValues = [
  "ACTIVE",
  "SUPERSEDED",
  "NEEDS_EMBEDDING",
  "EMBEDDED",
  "FAILED",
  "DELETING",
  "DELETED",
] as const;
const embeddingStatusValues = [
  "PENDING",
  "EMBEDDING",
  "INDEXED",
  "FAILED",
  "SUPERSEDED",
  "DELETING",
  "DELETED",
] as const;
const retrievalStatusValues = ["SUCCESS", "PARTIAL_SUCCESS", "FAILED"] as const;
const healthStatusValues = ["ok", "error"] as const;

const exampleKnowledgeBaseId = "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4";
const exampleSourceId = "adf1ed11-f72e-4af4-9a1b-9d6d9941d30e";
const exampleStorageObjectId = "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b";
const exampleFileId = "113d5fe3-927e-428d-9b55-557a6f776ed9";
const exampleTagId = "9a645c37-2f9d-4a02-8e7f-d7f4d08f52d2";
const exampleChunkId = "7bd8f4d6-0e8b-4f4d-a31c-47d236b8e965";
const exampleIngestionJobId = "4e946c9e-ea1e-48d4-aa8e-7f3e4a29c41d";
const exampleRetrievalQueryId = "6db3b2e6-b677-40a6-9a29-383793cf2f25";
const exampleParsedDocumentId = "4a4d1e7f-c2f0-4e3e-b898-011fb02e8f70";
const exampleChunkingConfigId = "eae6f4ac-7c72-45b1-a50a-b4e2b0f0e341";
const exampleEmbeddingConfigId = "d1c74195-9715-4986-8af7-f3388c1bf3a7";
const exampleEmbeddingModelId = "20d6e551-0803-4b5c-8a34-cc07e2dc777e";
const exampleQdrantCollectionId = "be3bf329-77e0-4793-9ac4-6d1ad4b7e913";
const exampleTimestamp = "2026-07-04T00:00:00.000Z";
const exampleChecksum =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const tagSummaryExample = {
  id: exampleTagId,
  name: "API Docs",
  normalizedName: "api-docs",
  color: "#2563eb",
};

const knowledgeBaseExample = {
  id: exampleKnowledgeBaseId,
  tenantId: "tenant_acme",
  organizationId: "org_acme",
  projectId: "project_docs",
  externalId: "kb_api_docs",
  name: "API Documentation",
  slug: "api-documentation",
  description: "Public API docs for retrieval.",
  status: "ACTIVE",
  metadata: { domain: "developer-docs" },
  createdAt: exampleTimestamp,
  updatedAt: exampleTimestamp,
  deletedAt: null,
};

const sourceExample = {
  id: exampleSourceId,
  tenantId: "tenant_acme",
  organizationId: "org_acme",
  projectId: "project_docs",
  knowledgeBaseId: exampleKnowledgeBaseId,
  parentSourceId: null,
  externalId: "source_openapi",
  name: "OpenAPI docs",
  slug: "openapi-docs",
  description: "Uploaded API specification sources.",
  type: "OPENAPI",
  syncMode: "MANUAL",
  status: "ACTIVE",
  processingState: "NOT_STARTED",
  uri: "s3://rag-documents/tenant_acme/openapi.yaml",
  checksumSha256: exampleChecksum,
  contentHash: null,
  lastIngestedAt: null,
  lastSyncedAt: null,
  metadata: { category: "api" },
  tags: [tagSummaryExample],
  createdAt: exampleTimestamp,
  updatedAt: exampleTimestamp,
  deletedAt: null,
};

const storageObjectExample = {
  id: exampleStorageObjectId,
  tenantId: "tenant_acme",
  organizationId: "org_acme",
  projectId: "project_docs",
  provider: "S3",
  bucket: "rag-documents",
  objectKey: "tenants/tenant_acme/sources/openapi.yaml",
  region: "us-east-1",
  endpoint: "https://s3.amazonaws.com",
  versionId: null,
  originalName: "openapi.yaml",
  mimeType: "application/yaml",
  extension: "yaml",
  sizeBytes: "2048",
  checksumSha256: exampleChecksum,
  etag: '"2cf24dba5fb0a30e"',
  metadata: { uploadedBy: "api-gateway" },
  createdAt: exampleTimestamp,
  updatedAt: exampleTimestamp,
  deletedAt: null,
};

const fileExample = {
  id: exampleFileId,
  tenantId: "tenant_acme",
  organizationId: "org_acme",
  projectId: "project_docs",
  knowledgeBaseId: exampleKnowledgeBaseId,
  sourceId: exampleSourceId,
  storageObjectId: exampleStorageObjectId,
  previousFileId: null,
  externalId: "file_openapi_yaml",
  originalName: "openapi.yaml",
  normalizedName: "openapi.yaml",
  logicalPath: "/docs/openapi.yaml",
  mimeType: "application/yaml",
  extension: "yaml",
  fileType: "OPENAPI",
  sizeBytes: "2048",
  checksumSha256: exampleChecksum,
  contentHash: null,
  version: 1,
  status: "STORED",
  processingState: "NOT_STARTED",
  title: "OpenAPI specification",
  description: "Source document for future ingestion.",
  language: "en",
  uploadedAt: exampleTimestamp,
  lastIngestedAt: null,
  lastEmbeddedAt: null,
  metadata: { category: "api" },
  tags: [tagSummaryExample],
  createdAt: exampleTimestamp,
  updatedAt: exampleTimestamp,
  deletedAt: null,
};

const tagExample = {
  id: exampleTagId,
  tenantId: "tenant_acme",
  organizationId: "org_acme",
  projectId: "project_docs",
  name: "API Docs",
  normalizedName: "api-docs",
  description: "Documents used for API support retrieval.",
  color: "#2563eb",
  metadata: { audience: "developers" },
  createdAt: exampleTimestamp,
  updatedAt: exampleTimestamp,
  deletedAt: null,
};

const chunkExample = {
  id: exampleChunkId,
  tenantId: "tenant_acme",
  organizationId: "org_acme",
  projectId: "project_docs",
  knowledgeBaseId: exampleKnowledgeBaseId,
  sourceId: exampleSourceId,
  fileId: exampleFileId,
  parsedDocumentId: exampleParsedDocumentId,
  chunkingConfigId: exampleChunkingConfigId,
  chunkIndex: 4,
  textPreview: "To upload a document, send a multipart request...",
  tokenCount: 120,
  charCount: 512,
  startChar: 1024,
  endChar: 1536,
  pageStart: 1,
  pageEnd: 1,
  headingPath: ["Files", "Upload"],
  contentHash: exampleChecksum,
  metadata: { section: "upload" },
  status: "EMBEDDED",
  chunkingConfig: {
    id: exampleChunkingConfigId,
    name: "Default Recursive Text Chunking",
    strategy: "RECURSIVE_TEXT",
  },
  latestEmbedding: {
    id: "6c6b8fd2-538b-4d62-bac0-06f741f6a611",
    status: "INDEXED",
    qdrantPointId: "2f6ef8a0-0170-4ed9-93f6-b76f6f61b037",
    vectorDimension: 1536,
    embeddedAt: exampleTimestamp,
    indexedAt: exampleTimestamp,
  },
  createdAt: exampleTimestamp,
  updatedAt: exampleTimestamp,
};

const chunkEmbeddingExample = {
  id: "6c6b8fd2-538b-4d62-bac0-06f741f6a611",
  tenantId: "tenant_acme",
  knowledgeBaseId: exampleKnowledgeBaseId,
  sourceId: exampleSourceId,
  fileId: exampleFileId,
  chunkId: exampleChunkId,
  embeddingConfigId: exampleEmbeddingConfigId,
  embeddingModelId: exampleEmbeddingModelId,
  qdrantCollectionId: exampleQdrantCollectionId,
  qdrantPointId: "2f6ef8a0-0170-4ed9-93f6-b76f6f61b037",
  vectorDimension: 1536,
  embeddedContentHash: exampleChecksum,
  payloadHash: exampleChecksum,
  status: "INDEXED",
  embeddedAt: exampleTimestamp,
  indexedAt: exampleTimestamp,
  lastSyncedAt: exampleTimestamp,
  embeddingConfig: {
    id: exampleEmbeddingConfigId,
    name: "Default Embedding Config",
  },
  embeddingModel: {
    id: exampleEmbeddingModelId,
    provider: "OPENAI",
    modelName: "text-embedding-3-small",
    dimension: 1536,
    distanceMetric: "COSINE",
  },
  qdrantCollection: {
    id: exampleQdrantCollectionId,
    name: "rag_kbs_default",
    vectorSize: 1536,
    distanceMetric: "COSINE",
  },
  createdAt: exampleTimestamp,
  updatedAt: exampleTimestamp,
};

const ingestionJobExample = {
  id: exampleIngestionJobId,
  tenantId: "tenant_acme",
  organizationId: "org_acme",
  projectId: "project_docs",
  knowledgeBaseId: exampleKnowledgeBaseId,
  sourceId: exampleSourceId,
  fileId: exampleFileId,
  type: "INGEST_FILE",
  status: "QUEUED",
  queueName: "ingestion",
  bullJobId: exampleIngestionJobId,
  attemptCount: 0,
  maxAttempts: 3,
  force: false,
  reason: "INITIAL_INGESTION",
  priority: 0,
  metadata: { requestedBy: "api-gateway" },
  errorCode: null,
  errorMessage: null,
  startedAt: null,
  finishedAt: null,
  cancelledAt: null,
  createdAt: exampleTimestamp,
  updatedAt: exampleTimestamp,
  latestAttempt: null,
};

const retrievalResultExample = {
  rank: 1,
  score: 0.82,
  chunkId: exampleChunkId,
  sourceId: exampleSourceId,
  fileId: exampleFileId,
  text: "To upload a document, send a multipart request...",
  textPreview: "To upload a document, send a multipart request...",
  metadata: {
    title: "Upload Guide",
    tags: ["api-docs"],
    mimeType: "text/markdown",
    chunkIndex: 4,
    headingPath: ["Files", "Upload"],
  },
};

const retrievalQueryExample = {
  queryId: exampleRetrievalQueryId,
  tenantId: "tenant_acme",
  knowledgeBaseId: exampleKnowledgeBaseId,
  query: "How do I upload documents?",
  topK: 8,
  resultCount: 1,
  results: [retrievalResultExample],
  latencyMs: 42,
  createdAt: exampleTimestamp,
};

const dependencyHealthExample = {
  status: "ok",
  dependency: "postgres",
  latencyMs: 12,
  timestamp: exampleTimestamp,
};

const errorExamplesByStatus: Record<string, OpenApiExample> = {
  "400": {
    summary: "Validation error",
    value: {
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      details: [
        {
          field: "tenantId",
          message: "tenantId is required",
        },
      ],
      requestId: "req_0393dc53-d5d2-4bb0-917d-7398c0479bf2",
      timestamp: exampleTimestamp,
      path: "/api/v1/sources",
    },
  },
  "404": {
    summary: "Not found",
    value: {
      statusCode: 404,
      error: "Not Found",
      message: "Resource was not found.",
      requestId: "req_0393dc53-d5d2-4bb0-917d-7398c0479bf2",
      timestamp: exampleTimestamp,
      path: "/api/v1/sources/adf1ed11-f72e-4af4-9a1b-9d6d9941d30e",
    },
  },
  "409": {
    summary: "Conflict",
    value: {
      statusCode: 409,
      error: "Conflict",
      message: "A record with the same unique fields already exists.",
      requestId: "req_0393dc53-d5d2-4bb0-917d-7398c0479bf2",
      timestamp: exampleTimestamp,
      path: "/api/v1/files",
    },
  },
  "500": {
    summary: "Internal server error",
    value: {
      statusCode: 500,
      error: "Internal Server Error",
      message: "Internal server error",
      requestId: "req_0393dc53-d5d2-4bb0-917d-7398c0479bf2",
      timestamp: exampleTimestamp,
      path: "/api/v1/query",
    },
  },
  "503": {
    summary: "Dependency unavailable",
    value: {
      statusCode: 503,
      error: "Service Unavailable",
      message: "Embedding or Qdrant dependency failed safely.",
      requestId: "req_0393dc53-d5d2-4bb0-917d-7398c0479bf2",
      timestamp: exampleTimestamp,
      path: "/api/v1/query",
    },
  },
  "504": {
    summary: "Gateway timeout",
    value: {
      statusCode: 504,
      error: "Gateway Timeout",
      message: "Retrieval timed out.",
      requestId: "req_0393dc53-d5d2-4bb0-917d-7398c0479bf2",
      timestamp: exampleTimestamp,
      path: "/api/v1/query",
    },
  },
};

const operationDocumentationByRoute: Record<string, OperationDocumentation> = {
  "GET /api/v1": {
    summary: "Get API greeting",
    description:
      "Returns a small default greeting that confirms the versioned API route is reachable.",
  },
  "GET /health/live": {
    summary: "Check API liveness",
    description:
      "Returns process liveness without checking PostgreSQL, Redis, Qdrant, storage, or queues.",
  },
  "GET /health/ready": {
    summary: "Check API readiness",
    description:
      "Checks every critical dependency and returns 503 when any dependency is unhealthy.",
  },
  "GET /health": {
    summary: "Get overall health",
    description:
      "Returns service metadata, uptime, and the current status of every dependency.",
  },
  "GET /health/postgres": {
    summary: "Check PostgreSQL health",
    description:
      "Runs a lightweight PostgreSQL connectivity probe through Prisma.",
  },
  "GET /health/redis": {
    summary: "Check Redis health",
    description: "Runs a Redis connectivity probe with PING.",
  },
  "GET /health/qdrant": {
    summary: "Check Qdrant health",
    description: "Checks Qdrant readiness through the configured Qdrant URL.",
  },
  "GET /health/storage": {
    summary: "Check object storage health",
    description:
      "Checks the configured local or S3-compatible object storage driver.",
  },
  "GET /health/queue": {
    summary: "Check ingestion queue health",
    description:
      "Checks BullMQ ingestion queue metadata access without enqueueing work.",
  },
};

const propertyDocumentationByName: Record<string, PropertyDocumentation> = {
  id: {
    description: "Unique UUID for the resource.",
    example: exampleKnowledgeBaseId,
    format: "uuid",
  },
  tenantId: {
    description:
      "Trusted tenant boundary supplied by the upstream service. All normal reads and writes are tenant scoped.",
    example: "tenant_acme",
  },
  organizationId: {
    description: "Optional upstream organization scope used for filtering.",
    example: "org_acme",
  },
  projectId: {
    description: "Optional upstream project scope used for filtering.",
    example: "project_docs",
  },
  externalId: {
    description: "Optional caller-owned stable identifier for the resource.",
    example: "external_resource_123",
  },
  name: {
    description: "Human-readable display name.",
    example: "API Documentation",
  },
  slug: {
    description:
      "URL-safe normalized name. When omitted on create, the service derives it from the name.",
    example: "api-documentation",
  },
  description: {
    description: "Optional long-form description.",
    example: "Public API docs for retrieval.",
  },
  status: {
    description: "Current lifecycle or processing status for the resource.",
    example: "ACTIVE",
  },
  metadata: {
    description:
      "JSON-compatible metadata object. Unknown fields inside metadata are allowed, but the surrounding DTO is strict.",
    example: { domain: "developer-docs" },
  },
  createdAt: {
    description: "ISO 8601 timestamp when the resource was created.",
    example: exampleTimestamp,
    format: "date-time",
  },
  updatedAt: {
    description: "ISO 8601 timestamp when the resource was last updated.",
    example: exampleTimestamp,
    format: "date-time",
  },
  deletedAt: {
    description:
      "ISO 8601 timestamp when the resource was soft-deleted, or null when active.",
    example: null,
    format: "date-time",
  },
  knowledgeBaseId: {
    description: "Knowledge base UUID that owns the resource.",
    example: exampleKnowledgeBaseId,
    format: "uuid",
  },
  parentSourceId: {
    description: "Optional parent source UUID for hierarchical sources.",
    example: exampleSourceId,
    format: "uuid",
  },
  sourceId: {
    description: "Source UUID that owns or filters the resource.",
    example: exampleSourceId,
    format: "uuid",
  },
  sourceIds: {
    description: "One or more source UUIDs used as a retrieval filter.",
    example: [exampleSourceId],
  },
  storageObjectId: {
    description: "Storage object UUID containing the physical file bytes.",
    example: exampleStorageObjectId,
    format: "uuid",
  },
  previousFileId: {
    description: "Optional previous file UUID for version history.",
    example: exampleFileId,
    format: "uuid",
  },
  fileId: {
    description: "Document file UUID that owns or filters the resource.",
    example: exampleFileId,
    format: "uuid",
  },
  fileIds: {
    description: "One or more document file UUIDs used as a retrieval filter.",
    example: [exampleFileId],
  },
  tagId: {
    description: "Tag UUID used in a source or file tag assignment.",
    example: exampleTagId,
    format: "uuid",
  },
  tagIds: {
    description:
      "One or more tag UUIDs. Query strings may provide repeated values or comma-separated values.",
    example: [exampleTagId],
  },
  tagNames: {
    description:
      "One or more tag names. The service normalizes names before filtering.",
    example: ["api-docs", "policy"],
  },
  tags: {
    description: "Tag summaries or tag names attached to the resource.",
    example: [tagSummaryExample],
  },
  type: {
    description: "Resource type discriminator.",
    example: "OPENAPI",
  },
  syncMode: {
    description: "How a source is expected to be refreshed.",
    example: "MANUAL",
  },
  processingState: {
    description: "Current background processing state.",
    example: "NOT_STARTED",
  },
  uri: {
    description:
      "Optional source URI, such as a URL, sitemap URL, or object storage reference.",
    example: "s3://rag-documents/tenant_acme/openapi.yaml",
  },
  checksumSha256: {
    description:
      "SHA-256 hex checksum used for duplicate detection and idempotency.",
    example: exampleChecksum,
  },
  contentHash: {
    description:
      "SHA-256 hex hash of normalized extracted or chunked content when known.",
    example: exampleChecksum,
  },
  lastIngestedAt: {
    description:
      "ISO 8601 timestamp of the last completed ingestion, or null when never ingested.",
    example: exampleTimestamp,
    format: "date-time",
  },
  lastSyncedAt: {
    description:
      "ISO 8601 timestamp of the last external source or metadata sync, or null when never synced.",
    example: exampleTimestamp,
    format: "date-time",
  },
  provider: {
    description: "Object storage provider that owns the physical object.",
    example: "S3",
  },
  bucket: {
    description: "Object storage bucket name when the provider uses buckets.",
    example: "rag-documents",
  },
  objectKey: {
    description: "Provider-specific object key or path for the stored bytes.",
    example: "tenants/tenant_acme/sources/openapi.yaml",
  },
  region: {
    description: "Object storage region when applicable.",
    example: "us-east-1",
  },
  endpoint: {
    description: "Object storage endpoint when applicable.",
    example: "https://s3.amazonaws.com",
  },
  versionId: {
    description: "Provider-specific object version ID when available.",
    example: "3HL4kqtJlcpXrof3",
  },
  originalName: {
    description: "Original filename supplied by the caller or upload.",
    example: "openapi.yaml",
  },
  normalizedName: {
    description: "Normalized filename or tag name used for searching.",
    example: "openapi.yaml",
  },
  logicalPath: {
    description: "Optional logical path of the file inside the source.",
    example: "/docs/openapi.yaml",
  },
  mimeType: {
    description: "MIME type of the file or retrieval payload.",
    example: "text/markdown",
  },
  mimeTypes: {
    description: "One or more MIME types used as a retrieval filter.",
    example: ["text/markdown"],
  },
  extension: {
    description: "File extension without the leading dot.",
    example: "yaml",
  },
  fileType: {
    description: "Normalized document file type.",
    example: "OPENAPI",
  },
  sizeBytes: {
    description:
      "File size in bytes. Large values are serialized as strings in API responses.",
    example: "2048",
  },
  etag: {
    description: "Provider-specific entity tag when available.",
    example: '"2cf24dba5fb0a30e"',
  },
  version: {
    description: "Logical file version number.",
    example: 1,
  },
  title: {
    description: "Optional document title used for retrieval context.",
    example: "OpenAPI specification",
  },
  language: {
    description: "Language code or locale associated with the document.",
    example: "en",
  },
  uploadedAt: {
    description: "ISO 8601 timestamp when the file was uploaded.",
    example: exampleTimestamp,
    format: "date-time",
  },
  lastEmbeddedAt: {
    description:
      "ISO 8601 timestamp of the last completed embedding/indexing pass.",
    example: exampleTimestamp,
    format: "date-time",
  },
  color: {
    description: "Optional display color for the tag.",
    example: "#2563eb",
  },
  page: {
    description:
      "Page number for paginated list responses. Minimum value is 1.",
    example: 1,
  },
  limit: {
    description: "Maximum records per page. Minimum is 1 and maximum is 100.",
    example: 20,
  },
  total: {
    description: "Total number of records that match the filters.",
    example: 42,
  },
  totalPages: {
    description: "Total number of pages available for the current limit.",
    example: 3,
  },
  pagination: {
    description: "Pagination metadata for list responses.",
    example: { page: 1, limit: 20, total: 1, totalPages: 1 },
  },
  data: {
    description: "Page of records returned by a list endpoint.",
    example: [knowledgeBaseExample],
  },
  sortBy: {
    description: "Field used to sort the list response.",
    example: "createdAt",
  },
  sortDirection: {
    description: "Sort direction for the list response.",
    example: "asc",
  },
  search: {
    description: "Case-insensitive search term applied to resource fields.",
    example: "api",
  },
  createdAtFrom: {
    description: "Inclusive ISO date lower bound for ingestion job creation.",
    example: "2026-07-01",
    format: "date",
  },
  createdAtTo: {
    description: "Inclusive ISO date upper bound for ingestion job creation.",
    example: "2026-07-31",
    format: "date",
  },
  file: {
    description: "Uploaded binary file field in multipart/form-data requests.",
    example: "(binary file)",
  },
  force: {
    description:
      "When true, creates a re-ingestion job instead of reusing completed work.",
    example: false,
  },
  reason: {
    description: "Human-readable reason for ingestion or re-ingestion.",
    example: "INITIAL_INGESTION",
  },
  queueName: {
    description: "BullMQ queue name used for the ingestion job.",
    example: "ingestion",
  },
  bullJobId: {
    description: "BullMQ job ID assigned after queueing.",
    example: exampleIngestionJobId,
  },
  attemptCount: {
    description: "Number of worker attempts already recorded for the job.",
    example: 0,
  },
  maxAttempts: {
    description: "Maximum BullMQ attempts configured for the job.",
    example: 3,
  },
  priority: {
    description: "BullMQ priority value for the job.",
    example: 0,
  },
  errorCode: {
    description: "Safe stable error code when the operation failed.",
    example: "UNSUPPORTED_MIME_TYPE",
  },
  errorMessage: {
    description: "Safe public error message when the operation failed.",
    example:
      "This file type is not supported by the current ingestion pipeline.",
  },
  latestAttempt: {
    description:
      "Most recent worker attempt summary, or null when no attempt started.",
    example: null,
  },
  attemptNumber: {
    description: "Sequential worker attempt number for an ingestion job.",
    example: 1,
  },
  workerId: {
    description: "Worker process identifier that handled the attempt.",
    example: "worker-host-1:12345",
  },
  startedAt: {
    description: "ISO 8601 timestamp when processing started.",
    example: exampleTimestamp,
    format: "date-time",
  },
  finishedAt: {
    description: "ISO 8601 timestamp when processing finished.",
    example: exampleTimestamp,
    format: "date-time",
  },
  cancelledAt: {
    description: "ISO 8601 timestamp when the job was cancelled.",
    example: exampleTimestamp,
    format: "date-time",
  },
  durationMs: {
    description: "Elapsed processing duration in milliseconds.",
    example: 2000,
  },
  parsedDocumentId: {
    description:
      "Parsed document UUID associated with a chunk or ingestion job.",
    example: exampleParsedDocumentId,
    format: "uuid",
  },
  chunkingConfigId: {
    description: "Chunking configuration UUID used to produce the chunk.",
    example: exampleChunkingConfigId,
    format: "uuid",
  },
  chunkIndex: {
    description: "Zero-based chunk position inside the parsed document.",
    example: 4,
  },
  textPreview: {
    description:
      "Safe bounded text preview. Debug endpoints never return vectors.",
    example: "To upload a document, send a multipart request...",
  },
  tokenCount: {
    description: "Estimated token count for the chunk or document.",
    example: 120,
  },
  charCount: {
    description: "Character count for the chunk or parsed document.",
    example: 512,
  },
  startChar: {
    description: "Inclusive character offset where the chunk starts.",
    example: 1024,
  },
  endChar: {
    description: "Exclusive character offset where the chunk ends.",
    example: 1536,
  },
  pageStart: {
    description: "First page represented by the chunk when page data exists.",
    example: 1,
  },
  pageEnd: {
    description: "Last page represented by the chunk when page data exists.",
    example: 1,
  },
  headingPath: {
    description:
      "Document heading path or structural breadcrumb for the chunk.",
    example: ["Files", "Upload"],
  },
  chunkingConfig: {
    description: "Summary of the chunking configuration used for the chunk.",
    example: {
      id: exampleChunkingConfigId,
      name: "Default Recursive Text Chunking",
      strategy: "RECURSIVE_TEXT",
    },
  },
  strategy: {
    description: "Chunking strategy name used by a chunking configuration.",
    example: "RECURSIVE_TEXT",
  },
  latestEmbedding: {
    description:
      "Latest embedding summary for the chunk, without vector values.",
    example: chunkExample.latestEmbedding,
  },
  embeddingConfigId: {
    description: "Embedding configuration UUID used for the chunk embedding.",
    example: exampleEmbeddingConfigId,
    format: "uuid",
  },
  embeddingModelId: {
    description: "Embedding model UUID used for the chunk embedding.",
    example: exampleEmbeddingModelId,
    format: "uuid",
  },
  qdrantCollectionId: {
    description: "Qdrant collection metadata UUID used for vector indexing.",
    example: exampleQdrantCollectionId,
    format: "uuid",
  },
  qdrantPointId: {
    description: "Qdrant point identifier. Vector values are never returned.",
    example: "2f6ef8a0-0170-4ed9-93f6-b76f6f61b037",
  },
  embeddingConfig: {
    description:
      "Embedding configuration summary used for the chunk embedding.",
    example: {
      id: exampleEmbeddingConfigId,
      name: "Default Embedding Config",
    },
  },
  embeddingModel: {
    description: "Embedding model summary used for the chunk embedding.",
    example: {
      id: exampleEmbeddingModelId,
      provider: "OPENAI",
      modelName: "text-embedding-3-small",
      dimension: 1536,
      distanceMetric: "COSINE",
    },
  },
  qdrantCollection: {
    description: "Qdrant collection summary used for vector indexing.",
    example: {
      id: exampleQdrantCollectionId,
      name: "rag_kbs_default",
      vectorSize: 1536,
      distanceMetric: "COSINE",
    },
  },
  vectorDimension: {
    description: "Embedding vector dimension stored in Qdrant.",
    example: 1536,
  },
  embeddedContentHash: {
    description: "Hash of the chunk text used to create the embedding.",
    example: exampleChecksum,
  },
  payloadHash: {
    description: "Hash of the Qdrant payload used to detect stale payloads.",
    example: exampleChecksum,
  },
  embeddedAt: {
    description: "ISO 8601 timestamp when embedding generation completed.",
    example: exampleTimestamp,
    format: "date-time",
  },
  indexedAt: {
    description: "ISO 8601 timestamp when the vector was indexed.",
    example: exampleTimestamp,
    format: "date-time",
  },
  queryId: {
    description: "Retrieval query UUID used for traceability.",
    example: exampleRetrievalQueryId,
    format: "uuid",
  },
  query: {
    description: "Natural-language retrieval query text.",
    example: "How do I upload documents?",
  },
  topK: {
    description: "Maximum number of results requested or returned.",
    example: 8,
  },
  scoreThreshold: {
    description: "Minimum similarity score required for returned results.",
    example: 0.2,
  },
  filters: {
    description:
      "Optional retrieval payload filters. Singular and plural forms for the same dimension cannot be used together.",
    example: {
      sourceIds: [exampleSourceId],
      tags: ["api-docs"],
      mimeTypes: ["text/markdown"],
      language: "en",
    },
  },
  includeMetadata: {
    description: "When true, include safe payload metadata for each result.",
    example: true,
  },
  includeText: {
    description: "When true, include full chunk text when Qdrant returned it.",
    example: true,
  },
  resultCount: {
    description: "Number of retrieval results returned.",
    example: 1,
  },
  results: {
    description: "Ranked retrieval result list.",
    example: [retrievalResultExample],
  },
  rank: {
    description: "One-based result rank.",
    example: 1,
  },
  score: {
    description: "Similarity score returned by Qdrant.",
    example: 0.82,
  },
  chunkId: {
    description: "Document chunk UUID for the retrieval result.",
    example: exampleChunkId,
    format: "uuid",
  },
  text: {
    description:
      "Full chunk text when includeText is true and text is available.",
    example: "To upload a document, send a multipart request...",
  },
  latencyMs: {
    description: "End-to-end operation latency in milliseconds.",
    example: 42,
  },
  service: {
    description: "Service name reporting health.",
    example: "rag-kbs-api",
  },
  timestamp: {
    description: "ISO 8601 timestamp when the response was generated.",
    example: exampleTimestamp,
    format: "date-time",
  },
  uptimeSeconds: {
    description: "Process uptime in seconds.",
    example: 120,
  },
  dependencies: {
    description: "Map of dependency health results keyed by dependency name.",
    example: { postgres: dependencyHealthExample },
  },
  dependency: {
    description: "Dependency name checked by a health endpoint.",
    example: "postgres",
  },
  environment: {
    description: "Application runtime environment.",
    example: "production",
  },
  message: {
    description: "Safe human-readable response or error message.",
    example: "Validation failed",
  },
  statusCode: {
    description: "HTTP status code for an error response.",
    example: 400,
  },
  error: {
    description: "HTTP reason phrase for an error response.",
    example: "Bad Request",
  },
  details: {
    description: "Field-level validation details when validation fails.",
    example: [{ field: "tenantId", message: "tenantId is required" }],
  },
  field: {
    description: "Validated field path associated with an error detail.",
    example: "tenantId",
  },
  requestId: {
    description: "Request ID returned in the response and x-request-id header.",
    example: "req_0393dc53-d5d2-4bb0-917d-7398c0479bf2",
  },
  path: {
    description: "Request path that produced the error.",
    example: "/api/v1/sources",
  },
};

/**
 * Complete the generated OpenAPI document with production-ready descriptions, examples, and schemas.
 * @param openApiDoc - Generated OpenAPI document.
 * @returns The same OpenAPI document after documentation-only enrichment.
 */
export function completeOpenApiDoc(openApiDoc: OpenAPIObject): OpenAPIObject {
  const document = openApiDoc as MutableOpenApiDocument;

  ensureDocumentShape(document);
  completeDocumentMetadata(document);
  registerComponentSchemas(document.components.schemas);
  completeComponentSchemas(document.components.schemas);
  completeOperations(document);

  return openApiDoc;
}

/**
 * Ensure mutable OpenAPI containers exist before enrichment.
 * @param document - Mutable OpenAPI document.
 */
function ensureDocumentShape(document: MutableOpenApiDocument): void {
  document.paths ??= {};
  document.components ??= { schemas: {} };
  document.components.schemas ??= {};
}

/**
 * Fill top-level OpenAPI metadata and tags.
 * @param document - Mutable OpenAPI document.
 */
function completeDocumentMetadata(document: MutableOpenApiDocument): void {
  document.info.description =
    "RAG-KBS is a backend-only Retrieval-Augmented Generation knowledge base service. It manages tenant-scoped metadata, binary storage references, ingestion jobs, chunk debugging, semantic retrieval, and dependency health checks.";
  document.tags = [
    {
      name: "App",
      description: "Basic API reachability endpoint.",
    },
    {
      name: "Health",
      description:
        "Version-neutral liveness, readiness, and dependency checks.",
    },
    {
      name: "Knowledge Bases",
      description: "Tenant-scoped logical RAG knowledge bases.",
    },
    {
      name: "Sources",
      description: "Logical sources inside knowledge bases.",
    },
    {
      name: "Storage",
      description: "Multipart binary upload and storage metadata creation.",
    },
    {
      name: "Storage Objects",
      description: "Physical object storage metadata.",
    },
    {
      name: "Files",
      description: "Logical document file metadata attached to sources.",
    },
    {
      name: "Tags",
      description: "Searchable metadata tags and source/file assignments.",
    },
    {
      name: "Chunks",
      description: "Safe read-only chunk and embedding debug endpoints.",
    },
    {
      name: "Ingestion",
      description: "BullMQ-backed ingestion job lifecycle endpoints.",
    },
    {
      name: "Retrieval",
      description: "Semantic retrieval and query traceability endpoints.",
    },
  ];
}

/**
 * Register reusable response schemas that are not fully expressible through Zod DTO classes.
 * @param schemas - OpenAPI component schema registry.
 */
function registerComponentSchemas(
  schemas: Record<string, OpenApiSchema>
): void {
  schemas.ValidationErrorDetail = createObjectSchema(
    {
      field: createStringSchema("tenantId"),
      message: createStringSchema("tenantId is required"),
    },
    ["field", "message"]
  );

  schemas.ErrorResponse = createObjectSchema(
    {
      statusCode: createNumberSchema(400),
      error: createStringSchema("Bad Request"),
      message: createStringSchema("Validation failed"),
      errorCode: createNullableStringSchema("UNSUPPORTED_MIME_TYPE"),
      details: createArraySchema(createRefSchema("ValidationErrorDetail")),
      requestId: createStringSchema("req_0393dc53-d5d2-4bb0-917d-7398c0479bf2"),
      timestamp: createDateTimeSchema(),
      path: createStringSchema("/api/v1/sources"),
    },
    ["statusCode", "error", "message", "requestId", "timestamp", "path"]
  );

  schemas.PaginationMeta = createObjectSchema(
    {
      page: createNumberSchema(1),
      limit: createNumberSchema(20),
      total: createNumberSchema(1),
      totalPages: createNumberSchema(1),
    },
    ["page", "limit", "total", "totalPages"]
  );

  schemas.TagSummaryResponse = createObjectSchema(
    {
      id: createUuidSchema(exampleTagId),
      name: createStringSchema("API Docs"),
      normalizedName: createStringSchema("api-docs"),
      color: createNullableStringSchema("#2563eb"),
    },
    ["id", "name", "normalizedName"]
  );

  schemas.KnowledgeBaseResponse = createKnowledgeBaseSchema();
  schemas.SourceResponse = createSourceSchema();
  schemas.StorageObjectResponse = createStorageObjectSchema();
  schemas.FileResponse = createFileSchema();
  schemas.TagResponse = createTagSchema();
  schemas.UploadFileResponseDto = createObjectSchema(
    {
      storageObject: createRefSchema("StorageObjectResponse"),
      file: createRefSchema("FileResponse"),
    },
    ["storageObject", "file"]
  );
  schemas.DocumentChunkResponseDto = createChunkSchema();
  schemas.DocumentChunkEmbeddingResponseDto = createChunkEmbeddingSchema();
  schemas.IngestionAttemptSummaryDto = createIngestionAttemptSchema();
  schemas.IngestionJobResponseDto = createIngestionJobSchema();
  schemas.RetrievalResultDto = createRetrievalResultSchema();
  schemas.RetrievalQueryResponseDto = createRetrievalQueryResponseSchema();
  schemas.RetrievalQueryDebugResponseDto = createRetrievalDebugSchema();
  schemas.DependencyHealthResult = createDependencyHealthSchema();
  schemas.LivenessResult = createLivenessSchema();
  schemas.ReadinessResult = createReadinessSchema();
  schemas.OverallHealthResult = createOverallHealthSchema();

  schemas.PaginatedKnowledgeBaseResponse = createPaginatedResponseSchema(
    "KnowledgeBaseResponse",
    [knowledgeBaseExample]
  );
  schemas.PaginatedSourceResponse = createPaginatedResponseSchema(
    "SourceResponse",
    [sourceExample]
  );
  schemas.PaginatedStorageObjectResponse = createPaginatedResponseSchema(
    "StorageObjectResponse",
    [storageObjectExample]
  );
  schemas.PaginatedFileResponse = createPaginatedResponseSchema(
    "FileResponse",
    [fileExample]
  );
  schemas.PaginatedTagResponse = createPaginatedResponseSchema("TagResponse", [
    tagExample,
  ]);
  schemas.PaginatedDocumentChunkResponse = createPaginatedResponseSchema(
    "DocumentChunkResponseDto",
    [chunkExample]
  );
  schemas.PaginatedIngestionJobResponse = createPaginatedResponseSchema(
    "IngestionJobResponseDto",
    [ingestionJobExample]
  );
}

/**
 * Add descriptions and examples to generated component schemas.
 * @param schemas - OpenAPI component schema registry.
 */
function completeComponentSchemas(
  schemas: Record<string, OpenApiSchema>
): void {
  for (const [schemaName, schema] of Object.entries(schemas)) {
    if (!schema.description) {
      schema.description = getSchemaDescription(schemaName);
    }

    completeSchemaProperties(schema);
  }
}

/**
 * Add descriptions and examples to a schema and nested schemas.
 * @param schema - OpenAPI schema.
 */
function completeSchemaProperties(schema: OpenApiSchema): void {
  if (schema.properties) {
    for (const [propertyName, propertySchema] of Object.entries(
      schema.properties
    )) {
      completePropertySchema(propertyName, propertySchema);
    }
  }

  for (const nestedSchema of [
    schema.items,
    ...(schema.oneOf ?? []),
    ...(schema.anyOf ?? []),
    ...(schema.allOf ?? []),
  ]) {
    if (nestedSchema) {
      completeSchemaProperties(nestedSchema);
    }
  }

  if (
    typeof schema.additionalProperties === "object" &&
    schema.additionalProperties !== null
  ) {
    completeSchemaProperties(schema.additionalProperties);
  }
}

/**
 * Add documentation to one schema property.
 * @param propertyName - Property name.
 * @param schema - Property schema.
 */
function completePropertySchema(
  propertyName: string,
  schema: OpenApiSchema
): void {
  const documentation = propertyDocumentationByName[propertyName];

  if (documentation) {
    schema.description = schema.description || documentation.description;
    schema.example =
      schema.example === undefined ? documentation.example : schema.example;

    if (documentation.format && !schema.format) {
      schema.format = documentation.format;
    }
  }

  if (schema.enum && schema.enum.length > 0) {
    schema.description = appendAllowedValues(
      schema.description ?? "Enum value.",
      schema.enum
    );

    if (schema.example === undefined) {
      schema.example = schema.enum[0];
    }
  }

  completeSchemaProperties(schema);
}

/**
 * Complete all operations in the document.
 * @param document - Mutable OpenAPI document.
 */
function completeOperations(document: MutableOpenApiDocument): void {
  for (const [path, pathItem] of Object.entries(document.paths)) {
    for (const method of ["get", "post", "put", "patch", "delete"] as const) {
      const operation = pathItem[method];

      if (!operation) {
        continue;
      }

      completeOperation(path, method, operation);
    }
  }
}

/**
 * Complete one OpenAPI operation.
 * @param path - OpenAPI path.
 * @param method - HTTP method.
 * @param operation - OpenAPI operation.
 */
function completeOperation(
  path: string,
  method: string,
  operation: OpenApiOperation
): void {
  const routeKey = buildRouteKey(method, path);
  const documentation = operationDocumentationByRoute[routeKey];

  operation.summary =
    operation.summary ??
    documentation?.summary ??
    createFallbackSummary(method, path);
  operation.description =
    operation.description ??
    documentation?.description ??
    createFallbackDescription(method, path);

  completeParameters(operation.parameters ?? []);
  completeRequestBody(path, method, operation);
  completeResponses(path, method, operation);
}

/**
 * Complete parameter descriptions and examples.
 * @param parameters - Operation parameters.
 */
function completeParameters(parameters: OpenApiParameter[]): void {
  for (const parameter of parameters) {
    const documentation = propertyDocumentationByName[parameter.name];

    parameter.description =
      parameter.description ??
      documentation?.description ??
      `Parameter ${parameter.name}.`;

    if (
      parameter.example === undefined &&
      documentation?.example !== undefined
    ) {
      parameter.example = documentation.example;
    }

    if (parameter.schema) {
      completeParameterSchema(parameter.name, parameter.schema);
    }
  }
}

/**
 * Complete one parameter schema with descriptions and examples.
 * @param parameterName - Parameter name.
 * @param schema - Parameter schema.
 */
function completeParameterSchema(
  parameterName: string,
  schema: OpenApiSchema
): void {
  const documentation = propertyDocumentationByName[parameterName];

  schema.description = schema.description ?? documentation?.description;

  if (schema.example === undefined && documentation?.example !== undefined) {
    schema.example = documentation.example;
  }

  if (schema.enum && schema.enum.length > 0) {
    schema.description = appendAllowedValues(
      schema.description ?? "Accepted enum value.",
      schema.enum
    );
  }
}

/**
 * Complete request body descriptions and examples.
 * @param path - OpenAPI path.
 * @param method - HTTP method.
 * @param operation - OpenAPI operation.
 */
function completeRequestBody(
  path: string,
  method: string,
  operation: OpenApiOperation
): void {
  if (!operation.requestBody) {
    return;
  }

  const documentation = getRequestBodyDocumentation(path, method);
  operation.requestBody.description =
    operation.requestBody.description ?? documentation?.description;

  for (const content of Object.values(operation.requestBody.content ?? {})) {
    if (!content.schema) {
      content.schema = createObjectSchema({}, []);
    }

    if (!content.examples && documentation?.examples) {
      content.examples = documentation.examples;
    }
  }
}

/**
 * Complete response descriptions, schemas, and examples.
 * @param path - OpenAPI path.
 * @param method - HTTP method.
 * @param operation - OpenAPI operation.
 */
function completeResponses(
  path: string,
  method: string,
  operation: OpenApiOperation
): void {
  for (const [statusCode, response] of Object.entries(
    operation.responses ?? {}
  )) {
    if (statusCode === "204") {
      response.content = undefined;
      continue;
    }

    const documentation = getResponseDocumentation(
      path,
      method,
      statusCode,
      response.description
    );

    response.description = response.description || documentation.description;
    response.content = response.content ?? {};

    const contentType = documentation.contentType ?? jsonContentType;
    const content = response.content[contentType] ?? {};

    content.schema = content.schema ?? documentation.schema;

    if (!content.examples) {
      content.examples = {
        default: {
          summary: response.description,
          value: documentation.example,
        },
      };
    }

    response.content[contentType] = content;
  }
}

/**
 * Get route-specific request body documentation.
 * @param path - OpenAPI path.
 * @param method - HTTP method.
 * @returns Request body documentation when the operation has a body.
 */
function getRequestBodyDocumentation(
  path: string,
  method: string
): RequestBodyDocumentation | undefined {
  if (method === "post" && path === "/api/v1/storage/upload") {
    return {
      description:
        "Multipart request with trusted tenant/source fields and one binary file field named file.",
      examples: {
        default: {
          summary: "Upload a Markdown document",
          value: {
            tenantId: "tenant_acme",
            sourceId: exampleSourceId,
            knowledgeBaseId: exampleKnowledgeBaseId,
            title: "Product manual",
            description: "Source document for future ingestion.",
            metadata: '{"category":"manual","language":"en"}',
            file: "(binary file)",
          },
        },
      },
    };
  }

  if (method === "patch" && path.includes("/knowledge-bases/")) {
    return createJsonRequestBodyDocumentation({
      name: "API Documentation",
      description: "Updated description for retrieval.",
      metadata: { domain: "developer-docs" },
    });
  }

  if (method === "patch" && path.includes("/sources/")) {
    return createJsonRequestBodyDocumentation({
      name: "OpenAPI docs",
      processingState: "QUEUED",
      metadata: { category: "api" },
    });
  }

  if (method === "patch" && path.includes("/storage-objects/")) {
    return createJsonRequestBodyDocumentation({
      bucket: "rag-documents",
      objectKey: "tenants/tenant_acme/sources/openapi.yaml",
      metadata: { uploadedBy: "api-gateway" },
    });
  }

  if (method === "patch" && path.includes("/files/")) {
    return createJsonRequestBodyDocumentation({
      title: "OpenAPI specification",
      language: "en",
      metadata: { category: "api" },
    });
  }

  if (method === "patch" && path.includes("/tags/")) {
    return createJsonRequestBodyDocumentation({
      name: "API Docs",
      color: "#2563eb",
      metadata: { audience: "developers" },
    });
  }

  return {
    description: "Validated request body for this operation.",
    examples: {
      default: {
        summary: "Request body",
        value: {},
      },
    },
  };
}

/**
 * Create JSON request body documentation for update endpoints.
 * @param value - Example request value.
 * @returns Request body documentation.
 */
function createJsonRequestBodyDocumentation(
  value: Record<string, OpenApiJson>
): RequestBodyDocumentation {
  return {
    description:
      "Strict JSON request body. Unknown top-level fields are rejected by Zod validation.",
    examples: {
      default: {
        summary: "Request body",
        value,
      },
    },
  };
}

/**
 * Get documentation for one operation response.
 * @param path - OpenAPI path.
 * @param method - HTTP method.
 * @param statusCode - HTTP status code.
 * @param fallbackDescription - Existing response description.
 * @returns Response documentation.
 */
function getResponseDocumentation(
  path: string,
  method: string,
  statusCode: string,
  fallbackDescription: string | undefined
): ResponseDocumentation {
  if (statusCode.startsWith("4") || statusCode.startsWith("5")) {
    return createErrorResponseDocumentation(statusCode, fallbackDescription);
  }

  if (path === "/api/v1" && method === "get") {
    return {
      description: fallbackDescription ?? "Default API greeting returned.",
      schema: createStringSchema("Hello World!"),
      example: "Hello World!",
      contentType: textContentType,
    };
  }

  if (path === "/health/live") {
    return createSuccessResponseDocumentation(
      fallbackDescription ?? "The API process is alive.",
      "LivenessResult",
      {
        status: "ok",
        service: "rag-kbs-api",
        timestamp: exampleTimestamp,
        uptimeSeconds: 120,
      }
    );
  }

  if (path === "/health/ready") {
    return createSuccessResponseDocumentation(
      fallbackDescription ?? "Readiness result returned.",
      "ReadinessResult",
      {
        status: statusCode === "503" ? "error" : "ok",
        dependencies: { postgres: dependencyHealthExample },
        timestamp: exampleTimestamp,
      }
    );
  }

  if (path === "/health") {
    return createSuccessResponseDocumentation(
      fallbackDescription ?? "Overall health result returned.",
      "OverallHealthResult",
      {
        status: statusCode === "503" ? "error" : "ok",
        service: "rag-kbs-api",
        environment: "production",
        version: "0.0.1",
        uptimeSeconds: 120,
        timestamp: exampleTimestamp,
        dependencies: { postgres: dependencyHealthExample },
      }
    );
  }

  if (path.startsWith("/health/")) {
    return createSuccessResponseDocumentation(
      fallbackDescription ?? "Dependency health result returned.",
      "DependencyHealthResult",
      {
        ...dependencyHealthExample,
        dependency: path.replace("/health/", ""),
      }
    );
  }

  if (path === "/api/v1/storage/upload") {
    return createSuccessResponseDocumentation(
      fallbackDescription ?? "File stored and metadata created.",
      "UploadFileResponseDto",
      {
        storageObject: storageObjectExample,
        file: fileExample,
      }
    );
  }

  if (path === "/api/v1/query") {
    return createSuccessResponseDocumentation(
      fallbackDescription ?? "Relevant chunks returned.",
      "RetrievalQueryResponseDto",
      retrievalQueryExample
    );
  }

  if (path.includes("/retrieval-queries/")) {
    return createSuccessResponseDocumentation(
      fallbackDescription ?? "Retrieval query traceability returned.",
      "RetrievalQueryDebugResponseDto",
      {
        id: exampleRetrievalQueryId,
        tenantId: "tenant_acme",
        status: "SUCCESS",
        resultCount: 1,
        latencyMs: 42,
        results: [retrievalResultExample],
      }
    );
  }

  if (path.includes("/ingestion-jobs") || path.endsWith("/ingest")) {
    return getIngestionResponseDocumentation(
      path,
      statusCode,
      fallbackDescription
    );
  }

  if (path.includes("/chunks")) {
    return getChunkResponseDocumentation(path, fallbackDescription);
  }

  return getMetadataResponseDocumentation(
    path,
    method,
    fallbackDescription ?? "Response returned."
  );
}

/**
 * Create documentation for ingestion responses.
 * @param path - OpenAPI path.
 * @param statusCode - HTTP status code.
 * @param fallbackDescription - Existing response description.
 * @returns Response documentation.
 */
function getIngestionResponseDocumentation(
  path: string,
  statusCode: string,
  fallbackDescription: string | undefined
): ResponseDocumentation {
  if (path === "/api/v1/ingestion-jobs" && statusCode === "200") {
    return createSuccessResponseDocumentation(
      fallbackDescription ?? "Ingestion job list returned.",
      "PaginatedIngestionJobResponse",
      createPaginatedExample([ingestionJobExample])
    );
  }

  return createSuccessResponseDocumentation(
    fallbackDescription ?? "Ingestion job returned.",
    "IngestionJobResponseDto",
    ingestionJobExample
  );
}

/**
 * Create documentation for chunk debug responses.
 * @param path - OpenAPI path.
 * @param fallbackDescription - Existing response description.
 * @returns Response documentation.
 */
function getChunkResponseDocumentation(
  path: string,
  fallbackDescription: string | undefined
): ResponseDocumentation {
  if (path.endsWith("/embedding")) {
    return createSuccessResponseDocumentation(
      fallbackDescription ?? "Chunk embedding metadata returned.",
      "DocumentChunkEmbeddingResponseDto",
      chunkEmbeddingExample
    );
  }

  if (path === "/api/v1/chunks" || path.includes("/files/")) {
    return createSuccessResponseDocumentation(
      fallbackDescription ?? "Chunks returned.",
      "PaginatedDocumentChunkResponse",
      createPaginatedExample([chunkExample])
    );
  }

  return createSuccessResponseDocumentation(
    fallbackDescription ?? "Chunk returned.",
    "DocumentChunkResponseDto",
    chunkExample
  );
}

/**
 * Create documentation for metadata CRUD responses.
 * @param path - OpenAPI path.
 * @param method - HTTP method.
 * @param fallbackDescription - Existing response description.
 * @returns Response documentation.
 */
function getMetadataResponseDocumentation(
  path: string,
  method: string,
  fallbackDescription: string
): ResponseDocumentation {
  if (path.includes("/knowledge-bases")) {
    return createResourceDocumentation(
      method,
      fallbackDescription,
      "KnowledgeBaseResponse",
      "PaginatedKnowledgeBaseResponse",
      knowledgeBaseExample
    );
  }

  if (path.includes("/sources") && !path.includes("/tags/")) {
    return createResourceDocumentation(
      method,
      fallbackDescription,
      "SourceResponse",
      "PaginatedSourceResponse",
      sourceExample
    );
  }

  if (path.includes("/storage-objects")) {
    return createResourceDocumentation(
      method,
      fallbackDescription,
      "StorageObjectResponse",
      "PaginatedStorageObjectResponse",
      storageObjectExample
    );
  }

  if (path.includes("/files") && !path.includes("/tags/")) {
    return createResourceDocumentation(
      method,
      fallbackDescription,
      "FileResponse",
      "PaginatedFileResponse",
      fileExample
    );
  }

  if (path.includes("/tags")) {
    return createResourceDocumentation(
      method,
      fallbackDescription,
      "TagResponse",
      "PaginatedTagResponse",
      tagExample
    );
  }

  return {
    description: fallbackDescription,
    schema: createObjectSchema({}, []),
    example: {},
  };
}

/**
 * Create documentation for one metadata resource response.
 * @param method - HTTP method.
 * @param description - Response description.
 * @param itemSchemaName - Item schema component name.
 * @param paginatedSchemaName - Paginated schema component name.
 * @param itemExample - Item example.
 * @returns Response documentation.
 */
function createResourceDocumentation(
  method: string,
  description: string,
  itemSchemaName: string,
  paginatedSchemaName: string,
  itemExample: OpenApiJson
): ResponseDocumentation {
  if (method === "get" && description.toLowerCase().includes("list")) {
    return createSuccessResponseDocumentation(
      description,
      paginatedSchemaName,
      createPaginatedExample([itemExample])
    );
  }

  return createSuccessResponseDocumentation(
    description,
    itemSchemaName,
    itemExample
  );
}

/**
 * Create documentation for a successful JSON response.
 * @param description - Response description.
 * @param schemaName - Component schema name.
 * @param example - Response example.
 * @returns Response documentation.
 */
function createSuccessResponseDocumentation(
  description: string,
  schemaName: string,
  example: unknown
): ResponseDocumentation {
  return {
    description,
    schema: createRefSchema(schemaName),
    example,
  };
}

/**
 * Create documentation for an error response.
 * @param statusCode - HTTP status code.
 * @param fallbackDescription - Existing response description.
 * @returns Response documentation.
 */
function createErrorResponseDocumentation(
  statusCode: string,
  fallbackDescription: string | undefined
): ResponseDocumentation {
  const example =
    errorExamplesByStatus[statusCode] ?? errorExamplesByStatus["500"];

  return {
    description: fallbackDescription ?? example.summary ?? "Error response.",
    schema: createRefSchema("ErrorResponse"),
    example: example.value,
  };
}

/**
 * Create a paginated response example.
 * @param data - Page data.
 * @returns Paginated example.
 */
function createPaginatedExample(data: OpenApiJson[]): OpenApiJson {
  return {
    data,
    pagination: {
      page: 1,
      limit: 20,
      total: data.length,
      totalPages: 1,
    },
  };
}

/**
 * Create a paginated response schema.
 * @param itemSchemaName - Item component schema name.
 * @param example - Data array example.
 * @returns Paginated response schema.
 */
function createPaginatedResponseSchema(
  itemSchemaName: string,
  example: OpenApiJson[]
): OpenApiSchema {
  const schema = createObjectSchema(
    {
      data: createArraySchema(createRefSchema(itemSchemaName)),
      pagination: createRefSchema("PaginationMeta"),
    },
    ["data", "pagination"]
  );
  schema.example = createPaginatedExample(example);

  return schema;
}

/**
 * Create a knowledge base response schema.
 * @returns Knowledge base response schema.
 */
function createKnowledgeBaseSchema(): OpenApiSchema {
  return createObjectSchema(
    {
      id: createUuidSchema(exampleKnowledgeBaseId),
      tenantId: createStringSchema("tenant_acme"),
      organizationId: createNullableStringSchema("org_acme"),
      projectId: createNullableStringSchema("project_docs"),
      externalId: createNullableStringSchema("kb_api_docs"),
      name: createStringSchema("API Documentation"),
      slug: createStringSchema("api-documentation"),
      description: createNullableStringSchema("Public API docs for retrieval."),
      status: createEnumSchema(knowledgeBaseStatusValues, "ACTIVE"),
      metadata: createMetadataSchema({ domain: "developer-docs" }),
      createdAt: createDateTimeSchema(),
      updatedAt: createDateTimeSchema(),
      deletedAt: createNullableDateTimeSchema(),
    },
    ["id", "tenantId", "name", "slug", "status", "createdAt", "updatedAt"]
  );
}

/**
 * Create a source response schema.
 * @returns Source response schema.
 */
function createSourceSchema(): OpenApiSchema {
  return createObjectSchema(
    {
      id: createUuidSchema(exampleSourceId),
      tenantId: createStringSchema("tenant_acme"),
      organizationId: createNullableStringSchema("org_acme"),
      projectId: createNullableStringSchema("project_docs"),
      knowledgeBaseId: createUuidSchema(exampleKnowledgeBaseId),
      parentSourceId: createNullableUuidSchema(exampleSourceId),
      externalId: createNullableStringSchema("source_openapi"),
      name: createStringSchema("OpenAPI docs"),
      slug: createStringSchema("openapi-docs"),
      description: createNullableStringSchema(
        "Uploaded API specification sources."
      ),
      type: createEnumSchema(sourceTypeValues, "OPENAPI"),
      syncMode: createEnumSchema(sourceSyncModeValues, "MANUAL"),
      status: createEnumSchema(lifecycleStatusValues, "ACTIVE"),
      processingState: createEnumSchema(processingStateValues, "NOT_STARTED"),
      uri: createNullableStringSchema(
        "s3://rag-documents/tenant_acme/openapi.yaml"
      ),
      checksumSha256: createNullableStringSchema(exampleChecksum),
      contentHash: createNullableStringSchema(exampleChecksum),
      lastIngestedAt: createNullableDateTimeSchema(),
      lastSyncedAt: createNullableDateTimeSchema(),
      metadata: createMetadataSchema({ category: "api" }),
      tags: createArraySchema(createRefSchema("TagSummaryResponse")),
      createdAt: createDateTimeSchema(),
      updatedAt: createDateTimeSchema(),
      deletedAt: createNullableDateTimeSchema(),
    },
    [
      "id",
      "tenantId",
      "knowledgeBaseId",
      "name",
      "slug",
      "type",
      "syncMode",
      "status",
      "processingState",
      "tags",
      "createdAt",
      "updatedAt",
    ]
  );
}

/**
 * Create a storage object response schema.
 * @returns Storage object response schema.
 */
function createStorageObjectSchema(): OpenApiSchema {
  return createObjectSchema(
    {
      id: createUuidSchema(exampleStorageObjectId),
      tenantId: createStringSchema("tenant_acme"),
      organizationId: createNullableStringSchema("org_acme"),
      projectId: createNullableStringSchema("project_docs"),
      provider: createEnumSchema(storageProviderValues, "S3"),
      bucket: createNullableStringSchema("rag-documents"),
      objectKey: createStringSchema("tenants/tenant_acme/sources/openapi.yaml"),
      region: createNullableStringSchema("us-east-1"),
      endpoint: createNullableStringSchema("https://s3.amazonaws.com"),
      versionId: createNullableStringSchema("3HL4kqtJlcpXrof3"),
      originalName: createNullableStringSchema("openapi.yaml"),
      mimeType: createNullableStringSchema("application/yaml"),
      extension: createNullableStringSchema("yaml"),
      sizeBytes: createStringSchema("2048"),
      checksumSha256: createStringSchema(exampleChecksum),
      etag: createNullableStringSchema('"2cf24dba5fb0a30e"'),
      metadata: createMetadataSchema({ uploadedBy: "api-gateway" }),
      createdAt: createDateTimeSchema(),
      updatedAt: createDateTimeSchema(),
      deletedAt: createNullableDateTimeSchema(),
    },
    [
      "id",
      "tenantId",
      "provider",
      "objectKey",
      "sizeBytes",
      "checksumSha256",
      "createdAt",
      "updatedAt",
    ]
  );
}

/**
 * Create a document file response schema.
 * @returns Document file response schema.
 */
function createFileSchema(): OpenApiSchema {
  return createObjectSchema(
    {
      id: createUuidSchema(exampleFileId),
      tenantId: createStringSchema("tenant_acme"),
      organizationId: createNullableStringSchema("org_acme"),
      projectId: createNullableStringSchema("project_docs"),
      knowledgeBaseId: createUuidSchema(exampleKnowledgeBaseId),
      sourceId: createUuidSchema(exampleSourceId),
      storageObjectId: createUuidSchema(exampleStorageObjectId),
      previousFileId: createNullableUuidSchema(exampleFileId),
      externalId: createNullableStringSchema("file_openapi_yaml"),
      originalName: createStringSchema("openapi.yaml"),
      normalizedName: createNullableStringSchema("openapi.yaml"),
      logicalPath: createNullableStringSchema("/docs/openapi.yaml"),
      mimeType: createStringSchema("application/yaml"),
      extension: createNullableStringSchema("yaml"),
      fileType: createEnumSchema(documentFileTypeValues, "OPENAPI"),
      sizeBytes: createStringSchema("2048"),
      checksumSha256: createStringSchema(exampleChecksum),
      contentHash: createNullableStringSchema(exampleChecksum),
      version: createNumberSchema(1),
      status: createEnumSchema(fileStatusValues, "STORED"),
      processingState: createEnumSchema(processingStateValues, "NOT_STARTED"),
      title: createNullableStringSchema("OpenAPI specification"),
      description: createNullableStringSchema(
        "Source document for future ingestion."
      ),
      language: createNullableStringSchema("en"),
      uploadedAt: createDateTimeSchema(),
      lastIngestedAt: createNullableDateTimeSchema(),
      lastEmbeddedAt: createNullableDateTimeSchema(),
      metadata: createMetadataSchema({ category: "api" }),
      tags: createArraySchema(createRefSchema("TagSummaryResponse")),
      createdAt: createDateTimeSchema(),
      updatedAt: createDateTimeSchema(),
      deletedAt: createNullableDateTimeSchema(),
    },
    [
      "id",
      "tenantId",
      "knowledgeBaseId",
      "sourceId",
      "storageObjectId",
      "originalName",
      "mimeType",
      "fileType",
      "sizeBytes",
      "checksumSha256",
      "version",
      "status",
      "processingState",
      "uploadedAt",
      "tags",
      "createdAt",
      "updatedAt",
    ]
  );
}

/**
 * Create a tag response schema.
 * @returns Tag response schema.
 */
function createTagSchema(): OpenApiSchema {
  return createObjectSchema(
    {
      id: createUuidSchema(exampleTagId),
      tenantId: createStringSchema("tenant_acme"),
      organizationId: createNullableStringSchema("org_acme"),
      projectId: createNullableStringSchema("project_docs"),
      name: createStringSchema("API Docs"),
      normalizedName: createStringSchema("api-docs"),
      description: createNullableStringSchema(
        "Documents used for API support retrieval."
      ),
      color: createNullableStringSchema("#2563eb"),
      metadata: createMetadataSchema({ audience: "developers" }),
      createdAt: createDateTimeSchema(),
      updatedAt: createDateTimeSchema(),
      deletedAt: createNullableDateTimeSchema(),
    },
    ["id", "tenantId", "name", "normalizedName", "createdAt", "updatedAt"]
  );
}

/**
 * Create a document chunk response schema.
 * @returns Document chunk response schema.
 */
function createChunkSchema(): OpenApiSchema {
  return createObjectSchema(
    {
      id: createUuidSchema(exampleChunkId),
      tenantId: createStringSchema("tenant_acme"),
      organizationId: createNullableStringSchema("org_acme"),
      projectId: createNullableStringSchema("project_docs"),
      knowledgeBaseId: createUuidSchema(exampleKnowledgeBaseId),
      sourceId: createUuidSchema(exampleSourceId),
      fileId: createUuidSchema(exampleFileId),
      parsedDocumentId: createUuidSchema(exampleParsedDocumentId),
      chunkingConfigId: createNullableUuidSchema(exampleChunkingConfigId),
      chunkIndex: createNumberSchema(4),
      textPreview: createStringSchema(
        "To upload a document, send a multipart request..."
      ),
      tokenCount: createNullableNumberSchema(120),
      charCount: createNullableNumberSchema(512),
      startChar: createNullableNumberSchema(1024),
      endChar: createNullableNumberSchema(1536),
      pageStart: createNullableNumberSchema(1),
      pageEnd: createNullableNumberSchema(1),
      headingPath: createArraySchema(createStringSchema("Files")),
      contentHash: createStringSchema(exampleChecksum),
      metadata: createMetadataSchema({ section: "upload" }),
      status: createEnumSchema(chunkStatusValues, "EMBEDDED"),
      chunkingConfig: createObjectSchema(
        {
          id: createUuidSchema(exampleChunkingConfigId),
          name: createStringSchema("Default Recursive Text Chunking"),
          strategy: createStringSchema("RECURSIVE_TEXT"),
        },
        ["id", "name", "strategy"]
      ),
      latestEmbedding: createObjectSchema(
        {
          id: createUuidSchema("6c6b8fd2-538b-4d62-bac0-06f741f6a611"),
          status: createEnumSchema(embeddingStatusValues, "INDEXED"),
          qdrantPointId: createStringSchema(
            "2f6ef8a0-0170-4ed9-93f6-b76f6f61b037"
          ),
          vectorDimension: createNumberSchema(1536),
          embeddedAt: createNullableDateTimeSchema(),
          indexedAt: createNullableDateTimeSchema(),
        },
        ["id", "status", "qdrantPointId", "vectorDimension"]
      ),
      createdAt: createDateTimeSchema(),
      updatedAt: createDateTimeSchema(),
    },
    [
      "id",
      "tenantId",
      "knowledgeBaseId",
      "sourceId",
      "fileId",
      "parsedDocumentId",
      "chunkIndex",
      "textPreview",
      "contentHash",
      "status",
      "createdAt",
      "updatedAt",
    ]
  );
}

/**
 * Create a chunk embedding response schema.
 * @returns Chunk embedding response schema.
 */
function createChunkEmbeddingSchema(): OpenApiSchema {
  return createObjectSchema(
    {
      id: createUuidSchema("6c6b8fd2-538b-4d62-bac0-06f741f6a611"),
      tenantId: createStringSchema("tenant_acme"),
      knowledgeBaseId: createUuidSchema(exampleKnowledgeBaseId),
      sourceId: createUuidSchema(exampleSourceId),
      fileId: createUuidSchema(exampleFileId),
      chunkId: createUuidSchema(exampleChunkId),
      embeddingConfigId: createUuidSchema(exampleEmbeddingConfigId),
      embeddingModelId: createUuidSchema(exampleEmbeddingModelId),
      qdrantCollectionId: createUuidSchema(exampleQdrantCollectionId),
      qdrantPointId: createStringSchema("2f6ef8a0-0170-4ed9-93f6-b76f6f61b037"),
      vectorDimension: createNumberSchema(1536),
      embeddedContentHash: createStringSchema(exampleChecksum),
      payloadHash: createNullableStringSchema(exampleChecksum),
      status: createEnumSchema(embeddingStatusValues, "INDEXED"),
      embeddedAt: createNullableDateTimeSchema(),
      indexedAt: createNullableDateTimeSchema(),
      lastSyncedAt: createNullableDateTimeSchema(),
      embeddingConfig: createMetadataSchema({
        id: exampleEmbeddingConfigId,
        name: "Default Embedding Config",
      }),
      embeddingModel: createMetadataSchema({
        id: exampleEmbeddingModelId,
        provider: "OPENAI",
        modelName: "text-embedding-3-small",
        dimension: 1536,
        distanceMetric: "COSINE",
      }),
      qdrantCollection: createMetadataSchema({
        id: exampleQdrantCollectionId,
        name: "rag_kbs_default",
        vectorSize: 1536,
        distanceMetric: "COSINE",
      }),
      createdAt: createDateTimeSchema(),
      updatedAt: createDateTimeSchema(),
    },
    [
      "id",
      "tenantId",
      "knowledgeBaseId",
      "sourceId",
      "fileId",
      "chunkId",
      "embeddingConfigId",
      "embeddingModelId",
      "qdrantCollectionId",
      "qdrantPointId",
      "vectorDimension",
      "embeddedContentHash",
      "status",
      "createdAt",
      "updatedAt",
    ]
  );
}

/**
 * Create an ingestion attempt summary schema.
 * @returns Ingestion attempt summary schema.
 */
function createIngestionAttemptSchema(): OpenApiSchema {
  return createObjectSchema(
    {
      id: createUuidSchema(exampleIngestionJobId),
      attemptNumber: createNumberSchema(1),
      status: createEnumSchema(attemptStatusValues, "COMPLETED"),
      workerId: createNullableStringSchema("worker-host-1:12345"),
      startedAt: createNullableDateTimeSchema(),
      finishedAt: createNullableDateTimeSchema(),
      durationMs: createNullableNumberSchema(2000),
      errorCode: createNullableStringSchema("UNSUPPORTED_MIME_TYPE"),
      errorMessage: createNullableStringSchema(
        "This file type is not supported by the current ingestion pipeline."
      ),
    },
    ["id", "attemptNumber", "status"]
  );
}

/**
 * Create an ingestion job response schema.
 * @returns Ingestion job response schema.
 */
function createIngestionJobSchema(): OpenApiSchema {
  return createObjectSchema(
    {
      id: createUuidSchema(exampleIngestionJobId),
      tenantId: createStringSchema("tenant_acme"),
      organizationId: createNullableStringSchema("org_acme"),
      projectId: createNullableStringSchema("project_docs"),
      knowledgeBaseId: createUuidSchema(exampleKnowledgeBaseId),
      sourceId: createNullableUuidSchema(exampleSourceId),
      fileId: createNullableUuidSchema(exampleFileId),
      type: createEnumSchema(ingestionJobTypeValues, "INGEST_FILE"),
      status: createEnumSchema(ingestionJobStatusValues, "QUEUED"),
      queueName: createStringSchema("ingestion"),
      bullJobId: createNullableStringSchema(exampleIngestionJobId),
      attemptCount: createNumberSchema(0),
      maxAttempts: createNumberSchema(3),
      force: createBooleanSchema(false),
      reason: createNullableStringSchema("INITIAL_INGESTION"),
      priority: createNumberSchema(0),
      metadata: createMetadataSchema({ requestedBy: "api-gateway" }),
      errorCode: createNullableStringSchema("UNSUPPORTED_MIME_TYPE"),
      errorMessage: createNullableStringSchema(
        "This file type is not supported by the current ingestion pipeline."
      ),
      latestAttempt: createRefSchema("IngestionAttemptSummaryDto"),
      startedAt: createNullableDateTimeSchema(),
      finishedAt: createNullableDateTimeSchema(),
      cancelledAt: createNullableDateTimeSchema(),
      createdAt: createDateTimeSchema(),
      updatedAt: createDateTimeSchema(),
    },
    [
      "id",
      "tenantId",
      "knowledgeBaseId",
      "type",
      "status",
      "queueName",
      "attemptCount",
      "maxAttempts",
      "force",
      "createdAt",
      "updatedAt",
    ]
  );
}

/**
 * Create a retrieval result schema.
 * @returns Retrieval result schema.
 */
function createRetrievalResultSchema(): OpenApiSchema {
  return createObjectSchema(
    {
      rank: createNumberSchema(1),
      score: createNumberSchema(0.82),
      chunkId: createUuidSchema(exampleChunkId),
      sourceId: createUuidSchema(exampleSourceId),
      fileId: createUuidSchema(exampleFileId),
      text: createStringSchema(
        "To upload a document, send a multipart request..."
      ),
      textPreview: createStringSchema(
        "To upload a document, send a multipart request..."
      ),
      metadata: createMetadataSchema({
        title: "Upload Guide",
        tags: ["api-docs"],
        mimeType: "text/markdown",
        chunkIndex: 4,
        headingPath: ["Files", "Upload"],
      }),
    },
    ["rank", "chunkId", "sourceId", "fileId", "textPreview"]
  );
}

/**
 * Create a retrieval query response schema.
 * @returns Retrieval query response schema.
 */
function createRetrievalQueryResponseSchema(): OpenApiSchema {
  return createObjectSchema(
    {
      queryId: createUuidSchema(exampleRetrievalQueryId),
      tenantId: createStringSchema("tenant_acme"),
      knowledgeBaseId: createUuidSchema(exampleKnowledgeBaseId),
      query: createStringSchema("How do I upload documents?"),
      topK: createNumberSchema(8),
      resultCount: createNumberSchema(1),
      results: createArraySchema(createRefSchema("RetrievalResultDto")),
      latencyMs: createNumberSchema(42),
      createdAt: createDateTimeSchema(),
    },
    [
      "queryId",
      "tenantId",
      "knowledgeBaseId",
      "query",
      "topK",
      "resultCount",
      "results",
      "latencyMs",
      "createdAt",
    ]
  );
}

/**
 * Create a retrieval debug response schema.
 * @returns Retrieval debug response schema.
 */
function createRetrievalDebugSchema(): OpenApiSchema {
  return createObjectSchema(
    {
      id: createUuidSchema(exampleRetrievalQueryId),
      tenantId: createStringSchema("tenant_acme"),
      status: createEnumSchema(retrievalStatusValues, "SUCCESS"),
      resultCount: createNumberSchema(1),
      latencyMs: createNullableNumberSchema(42),
      results: createArraySchema(createRefSchema("RetrievalResultDto")),
    },
    ["id", "tenantId", "status", "resultCount", "results"]
  );
}

/**
 * Create a dependency health response schema.
 * @returns Dependency health schema.
 */
function createDependencyHealthSchema(): OpenApiSchema {
  return createObjectSchema(
    {
      status: createEnumSchema(healthStatusValues, "ok"),
      dependency: createStringSchema("postgres"),
      latencyMs: createNumberSchema(12),
      message: createNullableStringSchema("PostgreSQL health check failed"),
      timestamp: createDateTimeSchema(),
    },
    ["status", "dependency", "timestamp"]
  );
}

/**
 * Create a liveness response schema.
 * @returns Liveness response schema.
 */
function createLivenessSchema(): OpenApiSchema {
  return createObjectSchema(
    {
      status: createEnumSchema(healthStatusValues, "ok"),
      service: createStringSchema("rag-kbs-api"),
      timestamp: createDateTimeSchema(),
      uptimeSeconds: createNumberSchema(120),
    },
    ["status", "service", "timestamp", "uptimeSeconds"]
  );
}

/**
 * Create a readiness response schema.
 * @returns Readiness response schema.
 */
function createReadinessSchema(): OpenApiSchema {
  return createObjectSchema(
    {
      status: createEnumSchema(healthStatusValues, "ok"),
      dependencies: createMetadataSchema({ postgres: dependencyHealthExample }),
      timestamp: createDateTimeSchema(),
    },
    ["status", "dependencies", "timestamp"]
  );
}

/**
 * Create an overall health response schema.
 * @returns Overall health response schema.
 */
function createOverallHealthSchema(): OpenApiSchema {
  return createObjectSchema(
    {
      status: createEnumSchema(healthStatusValues, "ok"),
      service: createStringSchema("rag-kbs-api"),
      environment: createStringSchema("production"),
      version: createNullableStringSchema("0.0.1"),
      uptimeSeconds: createNumberSchema(120),
      timestamp: createDateTimeSchema(),
      dependencies: createMetadataSchema({ postgres: dependencyHealthExample }),
    },
    [
      "status",
      "service",
      "environment",
      "uptimeSeconds",
      "timestamp",
      "dependencies",
    ]
  );
}

/**
 * Create an object schema.
 * @param properties - Object properties.
 * @param required - Required property names.
 * @returns Object schema.
 */
function createObjectSchema(
  properties: Record<string, OpenApiSchema>,
  required: string[]
): OpenApiSchema {
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

/**
 * Create a component reference schema.
 * @param schemaName - Component schema name.
 * @returns Reference schema.
 */
function createRefSchema(schemaName: string): OpenApiSchema {
  return { $ref: `#/components/schemas/${schemaName}` };
}

/**
 * Create a string schema.
 * @param example - Example value.
 * @returns String schema.
 */
function createStringSchema(example: string): OpenApiSchema {
  return {
    type: "string",
    example,
  };
}

/**
 * Create a nullable string schema.
 * @param example - Example value.
 * @returns Nullable string schema.
 */
function createNullableStringSchema(example: string | null): OpenApiSchema {
  return {
    type: "string",
    nullable: true,
    example,
  };
}

/**
 * Create a UUID string schema.
 * @param example - Example UUID.
 * @returns UUID schema.
 */
function createUuidSchema(example: string): OpenApiSchema {
  return {
    type: "string",
    format: "uuid",
    example,
  };
}

/**
 * Create a nullable UUID string schema.
 * @param example - Example UUID.
 * @returns Nullable UUID schema.
 */
function createNullableUuidSchema(example: string): OpenApiSchema {
  return {
    type: "string",
    format: "uuid",
    nullable: true,
    example,
  };
}

/**
 * Create a number schema.
 * @param example - Example number.
 * @returns Number schema.
 */
function createNumberSchema(example: number): OpenApiSchema {
  return {
    type: "number",
    example,
  };
}

/**
 * Create a nullable number schema.
 * @param example - Example number.
 * @returns Nullable number schema.
 */
function createNullableNumberSchema(example: number): OpenApiSchema {
  return {
    type: "number",
    nullable: true,
    example,
  };
}

/**
 * Create a boolean schema.
 * @param example - Example boolean.
 * @returns Boolean schema.
 */
function createBooleanSchema(example: boolean): OpenApiSchema {
  return {
    type: "boolean",
    example,
  };
}

/**
 * Create an ISO date-time string schema.
 * @returns Date-time schema.
 */
function createDateTimeSchema(): OpenApiSchema {
  return {
    type: "string",
    format: "date-time",
    example: exampleTimestamp,
  };
}

/**
 * Create a nullable ISO date-time string schema.
 * @returns Nullable date-time schema.
 */
function createNullableDateTimeSchema(): OpenApiSchema {
  return {
    type: "string",
    format: "date-time",
    nullable: true,
    example: null,
  };
}

/**
 * Create an enum string schema.
 * @param values - Allowed enum values.
 * @param example - Example enum value.
 * @returns Enum schema.
 */
function createEnumSchema(
  values: readonly string[],
  example: string
): OpenApiSchema {
  return {
    type: "string",
    enum: values,
    example,
  };
}

/**
 * Create an array schema.
 * @param itemSchema - Item schema.
 * @returns Array schema.
 */
function createArraySchema(itemSchema: OpenApiSchema): OpenApiSchema {
  return {
    type: "array",
    items: itemSchema,
  };
}

/**
 * Create a JSON metadata object schema.
 * @param example - Example JSON object.
 * @returns Metadata schema.
 */
function createMetadataSchema(example: OpenApiJson): OpenApiSchema {
  return {
    type: "object",
    additionalProperties: true,
    example,
  };
}

/**
 * Append allowed enum values to a description.
 * @param description - Existing description.
 * @param values - Allowed values.
 * @returns Description with allowed values.
 */
function appendAllowedValues(
  description: string,
  values: readonly string[]
): string {
  const allowedValuesText = `Allowed values: ${values.join(", ")}.`;

  if (description.includes("Allowed values:")) {
    return description;
  }

  return `${description} ${allowedValuesText}`;
}

/**
 * Build a stable operation documentation map key.
 * @param method - HTTP method.
 * @param path - OpenAPI path.
 * @returns Route key.
 */
function buildRouteKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

/**
 * Create a fallback operation summary.
 * @param method - HTTP method.
 * @param path - OpenAPI path.
 * @returns Fallback summary.
 */
function createFallbackSummary(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

/**
 * Create a fallback operation description.
 * @param method - HTTP method.
 * @param path - OpenAPI path.
 * @returns Fallback description.
 */
function createFallbackDescription(method: string, path: string): string {
  return `Handles ${method.toUpperCase()} requests for ${path}.`;
}

/**
 * Get a component schema description.
 * @param schemaName - Component schema name.
 * @returns Schema description.
 */
function getSchemaDescription(schemaName: string): string {
  const readableName = schemaName
    .replace(/Dto/g, "")
    .replace(/Response/g, " response")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/__/g, " nested ");

  return `${readableName} schema.`;
}
