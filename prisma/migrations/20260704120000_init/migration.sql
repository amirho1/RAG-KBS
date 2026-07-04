-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LifecycleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED', 'DELETING', 'DELETED');

-- CreateEnum
CREATE TYPE "ProcessingState" AS ENUM ('NOT_STARTED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "KnowledgeBaseStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETING', 'DELETED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('UPLOAD', 'URL', 'WEB_PAGE', 'SITEMAP', 'API_DOCUMENTATION', 'OPENAPI', 'SWAGGER', 'MARKDOWN', 'TEXT', 'POLICY', 'MANUAL', 'FAQ', 'DATABASE_EXPORT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SourceSyncMode" AS ENUM ('MANUAL', 'SCHEDULED', 'WEBHOOK', 'API_PUSH');

-- CreateEnum
CREATE TYPE "DocumentFileType" AS ENUM ('PDF', 'DOCX', 'TXT', 'MARKDOWN', 'HTML', 'CSV', 'XLSX', 'JSON', 'XML', 'IMAGE', 'AUDIO', 'VIDEO', 'OPENAPI', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('UPLOADED', 'STORED', 'WAITING_FOR_INGESTION', 'INGESTING', 'INGESTED', 'PARTIALLY_INGESTED', 'FAILED', 'NEEDS_REINGESTION', 'NEEDS_REEMBEDDING', 'DELETING', 'DELETED');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('LOCAL', 'S3', 'MINIO', 'GCS', 'AZURE_BLOB', 'CUSTOM');

-- CreateEnum
CREATE TYPE "IngestionJobType" AS ENUM ('INGEST_FILE', 'INGEST_SOURCE', 'REINGEST_FILE', 'REINGEST_SOURCE', 'REEMBED_FILE', 'REEMBED_SOURCE', 'DELETE_FILE_VECTORS', 'DELETE_SOURCE_VECTORS', 'REBUILD_KEYWORD_INDEX', 'MIGRATE_COLLECTION');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'RETRYING', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED', 'RETRYING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParserStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ChunkStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'NEEDS_EMBEDDING', 'EMBEDDED', 'FAILED', 'DELETING', 'DELETED');

-- CreateEnum
CREATE TYPE "EmbeddingProvider" AS ENUM ('OPENAI', 'AZURE_OPENAI', 'ANTHROPIC', 'GOOGLE', 'COHERE', 'VOYAGE', 'MISTRAL', 'HUGGINGFACE', 'OLLAMA', 'LOCAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DistanceMetric" AS ENUM ('COSINE', 'DOT', 'EUCLID', 'MANHATTAN');

-- CreateEnum
CREATE TYPE "QdrantCollectionStatus" AS ENUM ('ACTIVE', 'CREATING', 'MIGRATING', 'READ_ONLY', 'DEPRECATED', 'DELETING', 'DELETED', 'FAILED');

-- CreateEnum
CREATE TYPE "EmbeddingStatus" AS ENUM ('PENDING', 'EMBEDDING', 'INDEXED', 'FAILED', 'SUPERSEDED', 'DELETING', 'DELETED');

-- CreateEnum
CREATE TYPE "VectorOperationType" AS ENUM ('UPSERT', 'UPDATE_PAYLOAD', 'DELETE_POINT', 'DELETE_BY_FILTER', 'CREATE_COLLECTION', 'MIGRATE_COLLECTION', 'VERIFY_COLLECTION');

-- CreateEnum
CREATE TYPE "RetrievalSearchType" AS ENUM ('VECTOR', 'KEYWORD', 'HYBRID', 'SIMILAR_CHUNKS');

-- CreateEnum
CREATE TYPE "RetrievalStatus" AS ENUM ('SUCCESS', 'PARTIAL_SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ReprocessingType" AS ENUM ('REINGEST', 'REEMBED', 'RECHUNK', 'REPARSE', 'COLLECTION_MIGRATION', 'KEYWORD_REINDEX');

-- CreateEnum
CREATE TYPE "ReprocessingReason" AS ENUM ('MANUAL', 'SOURCE_CHANGED', 'FILE_CHANGED', 'PARSER_CHANGED', 'CHUNKING_CHANGED', 'EMBEDDING_MODEL_CHANGED', 'EMBEDDING_CONFIG_CHANGED', 'QDRANT_COLLECTION_CHANGED', 'FAILURE_RECOVERY', 'SCHEDULED_REFRESH');

-- CreateEnum
CREATE TYPE "ProcessingEventType" AS ENUM ('SOURCE_CREATED', 'SOURCE_UPDATED', 'FILE_UPLOADED', 'FILE_STORED', 'INGESTION_QUEUED', 'INGESTION_STARTED', 'PARSING_STARTED', 'PARSING_COMPLETED', 'CHUNKING_STARTED', 'CHUNKING_COMPLETED', 'EMBEDDING_STARTED', 'EMBEDDING_COMPLETED', 'VECTOR_INDEXING_STARTED', 'VECTOR_INDEXING_COMPLETED', 'RETRIEVAL_EXECUTED', 'REPROCESSING_STARTED', 'REPROCESSING_COMPLETED', 'ERROR_OCCURRED', 'SOFT_DELETED', 'RESTORED');

-- CreateTable
CREATE TABLE "knowledge_bases" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "externalId" VARCHAR(191),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "KnowledgeBaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "knowledge_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "knowledgeBaseId" UUID NOT NULL,
    "parentSourceId" UUID,
    "externalId" VARCHAR(191),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "SourceType" NOT NULL,
    "syncMode" "SourceSyncMode" NOT NULL DEFAULT 'MANUAL',
    "status" "LifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "processingState" "ProcessingState" NOT NULL DEFAULT 'NOT_STARTED',
    "uri" TEXT,
    "checksumSha256" VARCHAR(64),
    "contentHash" VARCHAR(64),
    "lastIngestedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_objects" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "provider" "StorageProvider" NOT NULL,
    "bucket" VARCHAR(255),
    "objectKey" TEXT NOT NULL,
    "region" VARCHAR(128),
    "endpoint" TEXT,
    "versionId" VARCHAR(255),
    "originalName" VARCHAR(512),
    "mimeType" VARCHAR(255),
    "extension" VARCHAR(32),
    "sizeBytes" BIGINT NOT NULL,
    "checksumSha256" VARCHAR(64) NOT NULL,
    "etag" VARCHAR(255),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "storage_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_files" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "knowledgeBaseId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "storageObjectId" UUID NOT NULL,
    "previousFileId" UUID,
    "externalId" VARCHAR(191),
    "originalName" VARCHAR(512) NOT NULL,
    "normalizedName" VARCHAR(512),
    "logicalPath" TEXT,
    "mimeType" VARCHAR(255) NOT NULL,
    "extension" VARCHAR(32),
    "fileType" "DocumentFileType" NOT NULL DEFAULT 'UNKNOWN',
    "sizeBytes" BIGINT NOT NULL,
    "checksumSha256" VARCHAR(64) NOT NULL,
    "contentHash" VARCHAR(64),
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "FileStatus" NOT NULL DEFAULT 'UPLOADED',
    "processingState" "ProcessingState" NOT NULL DEFAULT 'NOT_STARTED',
    "title" VARCHAR(512),
    "description" TEXT,
    "language" VARCHAR(32),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastIngestedAt" TIMESTAMP(3),
    "lastEmbeddedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "document_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "name" VARCHAR(128) NOT NULL,
    "normalizedName" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "color" VARCHAR(32),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base_tags" (
    "knowledgeBaseId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_base_tags_pkey" PRIMARY KEY ("knowledgeBaseId","tagId")
);

-- CreateTable
CREATE TABLE "source_tags" (
    "sourceId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_tags_pkey" PRIMARY KEY ("sourceId","tagId")
);

-- CreateTable
CREATE TABLE "file_tags" (
    "fileId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_tags_pkey" PRIMARY KEY ("fileId","tagId")
);

-- CreateTable
CREATE TABLE "parser_profiles" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "name" VARCHAR(255) NOT NULL,
    "parserName" VARCHAR(255) NOT NULL,
    "parserVersion" VARCHAR(64) NOT NULL,
    "config" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parser_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parsed_documents" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "knowledgeBaseId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "parserProfileId" UUID,
    "ingestionJobId" UUID,
    "status" "ParserStatus" NOT NULL DEFAULT 'PENDING',
    "parserName" VARCHAR(255) NOT NULL,
    "parserVersion" VARCHAR(64) NOT NULL,
    "title" VARCHAR(512),
    "language" VARCHAR(32),
    "extractedText" TEXT,
    "textPreview" TEXT,
    "charCount" INTEGER,
    "tokenCount" INTEGER,
    "pageCount" INTEGER,
    "contentHash" VARCHAR(64),
    "structure" JSONB,
    "errorCode" VARCHAR(128),
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "parsed_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chunking_configs" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "name" VARCHAR(255) NOT NULL,
    "strategy" VARCHAR(128) NOT NULL,
    "chunkSize" INTEGER NOT NULL,
    "chunkOverlap" INTEGER NOT NULL DEFAULT 0,
    "tokenizer" VARCHAR(128),
    "preserveHeadings" BOOLEAN NOT NULL DEFAULT true,
    "preserveTables" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chunking_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "knowledgeBaseId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "parsedDocumentId" UUID NOT NULL,
    "chunkingConfigId" UUID,
    "chunkIndex" INTEGER NOT NULL,
    "contentHash" VARCHAR(64) NOT NULL,
    "text" TEXT,
    "textPreview" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "charCount" INTEGER,
    "startChar" INTEGER,
    "endChar" INTEGER,
    "pageStart" INTEGER,
    "pageEnd" INTEGER,
    "headingPath" JSONB,
    "metadata" JSONB,
    "status" "ChunkStatus" NOT NULL DEFAULT 'NEEDS_EMBEDDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chunk_keyword_indexes" (
    "chunkId" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "knowledgeBaseId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "searchText" TEXT NOT NULL,
    "language" VARCHAR(32),
    "contentHash" VARCHAR(64) NOT NULL,
    "status" "ProcessingState" NOT NULL DEFAULT 'COMPLETED',
    "indexedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chunk_keyword_indexes_pkey" PRIMARY KEY ("chunkId")
);

-- CreateTable
CREATE TABLE "embedding_models" (
    "id" UUID NOT NULL,
    "provider" "EmbeddingProvider" NOT NULL,
    "modelName" VARCHAR(255) NOT NULL,
    "displayName" VARCHAR(255),
    "dimension" INTEGER NOT NULL,
    "distanceMetric" "DistanceMetric" NOT NULL DEFAULT 'COSINE',
    "maxInputTokens" INTEGER,
    "tokenizer" VARCHAR(128),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "embedding_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "embedding_configs" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "knowledgeBaseId" UUID,
    "embeddingModelId" UUID NOT NULL,
    "chunkingConfigId" UUID,
    "name" VARCHAR(255) NOT NULL,
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "embedding_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qdrant_collections" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "embeddingModelId" UUID NOT NULL,
    "embeddingConfigId" UUID,
    "name" VARCHAR(255) NOT NULL,
    "alias" VARCHAR(255),
    "vectorSize" INTEGER NOT NULL,
    "distanceMetric" "DistanceMetric" NOT NULL DEFAULT 'COSINE',
    "status" "QdrantCollectionStatus" NOT NULL DEFAULT 'CREATING',
    "isDefaultRead" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultWrite" BOOLEAN NOT NULL DEFAULT false,
    "migratedFromId" UUID,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "qdrant_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chunk_embeddings" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "knowledgeBaseId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "chunkId" UUID NOT NULL,
    "embeddingModelId" UUID NOT NULL,
    "embeddingConfigId" UUID NOT NULL,
    "qdrantCollectionId" UUID NOT NULL,
    "qdrantPointId" VARCHAR(191) NOT NULL,
    "status" "EmbeddingStatus" NOT NULL DEFAULT 'PENDING',
    "vectorDimension" INTEGER NOT NULL,
    "embeddedContentHash" VARCHAR(64) NOT NULL,
    "payloadHash" VARCHAR(64),
    "embeddedAt" TIMESTAMP(3),
    "indexedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "errorCode" VARCHAR(128),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "chunk_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vector_index_operations" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "qdrantCollectionId" UUID NOT NULL,
    "chunkEmbeddingId" UUID,
    "ingestionJobId" UUID,
    "type" "VectorOperationType" NOT NULL,
    "status" "ProcessingState" NOT NULL DEFAULT 'QUEUED',
    "qdrantPointId" VARCHAR(191),
    "filter" JSONB,
    "payload" JSONB,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "errorCode" VARCHAR(128),
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vector_index_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_jobs" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "knowledgeBaseId" UUID NOT NULL,
    "sourceId" UUID,
    "fileId" UUID,
    "parsedDocumentId" UUID,
    "type" "IngestionJobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "queueName" VARCHAR(128) NOT NULL DEFAULT 'ingestion',
    "bullJobId" VARCHAR(191),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "parserProfileId" UUID,
    "chunkingConfigId" UUID,
    "embeddingConfigId" UUID,
    "reprocessingBatchId" UUID,
    "requestId" VARCHAR(191),
    "correlationId" VARCHAR(191),
    "requestedByExternalId" VARCHAR(191),
    "totalFiles" INTEGER,
    "processedFiles" INTEGER,
    "totalChunks" INTEGER,
    "processedChunks" INTEGER,
    "totalTokens" INTEGER,
    "errorCode" VARCHAR(128),
    "errorMessage" TEXT,
    "errorDetails" JSONB,
    "metadata" JSONB,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingestion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_attempts" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "ingestionJobId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'STARTED',
    "workerId" VARCHAR(191),
    "hostname" VARCHAR(255),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "errorCode" VARCHAR(128),
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "errorDetails" JSONB,
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingestion_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reprocessing_batches" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "knowledgeBaseId" UUID NOT NULL,
    "type" "ReprocessingType" NOT NULL,
    "reason" "ReprocessingReason" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "scope" JSONB NOT NULL,
    "fromEmbeddingConfigId" UUID,
    "toEmbeddingConfigId" UUID,
    "totalItems" INTEGER,
    "processedItems" INTEGER,
    "failedItems" INTEGER,
    "errorCode" VARCHAR(128),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "requestedByExternalId" VARCHAR(191),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reprocessing_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_events" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "knowledgeBaseId" UUID,
    "sourceId" UUID,
    "fileId" UUID,
    "ingestionJobId" UUID,
    "type" "ProcessingEventType" NOT NULL,
    "state" "ProcessingState",
    "message" TEXT,
    "details" JSONB,
    "requestId" VARCHAR(191),
    "correlationId" VARCHAR(191),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rerank_models" (
    "id" UUID NOT NULL,
    "provider" "EmbeddingProvider" NOT NULL,
    "modelName" VARCHAR(255) NOT NULL,
    "displayName" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rerank_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retrieval_profiles" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "knowledgeBaseId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "searchType" "RetrievalSearchType" NOT NULL DEFAULT 'VECTOR',
    "embeddingConfigId" UUID,
    "qdrantCollectionId" UUID,
    "rerankModelId" UUID,
    "topK" INTEGER NOT NULL DEFAULT 10,
    "candidateK" INTEGER NOT NULL DEFAULT 50,
    "scoreThreshold" DOUBLE PRECISION,
    "config" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retrieval_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retrieval_queries" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(128) NOT NULL,
    "organizationId" VARCHAR(128),
    "projectId" VARCHAR(128),
    "knowledgeBaseId" UUID NOT NULL,
    "retrievalProfileId" UUID,
    "embeddingModelId" UUID,
    "qdrantCollectionId" UUID,
    "searchType" "RetrievalSearchType" NOT NULL,
    "status" "RetrievalStatus" NOT NULL DEFAULT 'SUCCESS',
    "queryText" TEXT,
    "queryHash" VARCHAR(64),
    "filters" JSONB,
    "topK" INTEGER NOT NULL,
    "candidateK" INTEGER,
    "scoreThreshold" DOUBLE PRECISION,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "qdrantLatencyMs" INTEGER,
    "rerankLatencyMs" INTEGER,
    "requestId" VARCHAR(191),
    "correlationId" VARCHAR(191),
    "requestedByExternalId" VARCHAR(191),
    "errorCode" VARCHAR(128),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retrieval_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retrieval_results" (
    "id" UUID NOT NULL,
    "retrievalQueryId" UUID NOT NULL,
    "chunkId" UUID,
    "chunkEmbeddingId" UUID,
    "qdrantPointId" VARCHAR(191),
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION,
    "vectorScore" DOUBLE PRECISION,
    "keywordScore" DOUBLE PRECISION,
    "rerankScore" DOUBLE PRECISION,
    "textPreview" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retrieval_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_bases_tenantId_organizationId_projectId_idx" ON "knowledge_bases"("tenantId", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "knowledge_bases_tenantId_status_idx" ON "knowledge_bases"("tenantId", "status");

-- CreateIndex
CREATE INDEX "knowledge_bases_deletedAt_idx" ON "knowledge_bases"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_bases_tenantId_slug_key" ON "knowledge_bases"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_bases_tenantId_externalId_key" ON "knowledge_bases"("tenantId", "externalId");

-- CreateIndex
CREATE INDEX "sources_tenantId_organizationId_projectId_idx" ON "sources"("tenantId", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "sources_knowledgeBaseId_status_idx" ON "sources"("knowledgeBaseId", "status");

-- CreateIndex
CREATE INDEX "sources_tenantId_type_idx" ON "sources"("tenantId", "type");

-- CreateIndex
CREATE INDEX "sources_checksumSha256_idx" ON "sources"("checksumSha256");

-- CreateIndex
CREATE INDEX "sources_contentHash_idx" ON "sources"("contentHash");

-- CreateIndex
CREATE INDEX "sources_deletedAt_idx" ON "sources"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sources_tenantId_knowledgeBaseId_slug_key" ON "sources"("tenantId", "knowledgeBaseId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "sources_tenantId_knowledgeBaseId_externalId_key" ON "sources"("tenantId", "knowledgeBaseId", "externalId");

-- CreateIndex
CREATE INDEX "storage_objects_tenantId_checksumSha256_idx" ON "storage_objects"("tenantId", "checksumSha256");

-- CreateIndex
CREATE INDEX "storage_objects_tenantId_provider_idx" ON "storage_objects"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "storage_objects_deletedAt_idx" ON "storage_objects"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "storage_objects_tenantId_provider_bucket_objectKey_key" ON "storage_objects"("tenantId", "provider", "bucket", "objectKey");

-- CreateIndex
CREATE INDEX "document_files_tenantId_organizationId_projectId_idx" ON "document_files"("tenantId", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "document_files_knowledgeBaseId_status_idx" ON "document_files"("knowledgeBaseId", "status");

-- CreateIndex
CREATE INDEX "document_files_sourceId_status_idx" ON "document_files"("sourceId", "status");

-- CreateIndex
CREATE INDEX "document_files_storageObjectId_idx" ON "document_files"("storageObjectId");

-- CreateIndex
CREATE INDEX "document_files_checksumSha256_idx" ON "document_files"("checksumSha256");

-- CreateIndex
CREATE INDEX "document_files_contentHash_idx" ON "document_files"("contentHash");

-- CreateIndex
CREATE INDEX "document_files_deletedAt_idx" ON "document_files"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "document_files_tenantId_sourceId_checksumSha256_key" ON "document_files"("tenantId", "sourceId", "checksumSha256");

-- CreateIndex
CREATE UNIQUE INDEX "document_files_tenantId_sourceId_externalId_key" ON "document_files"("tenantId", "sourceId", "externalId");

-- CreateIndex
CREATE INDEX "tags_tenantId_organizationId_projectId_idx" ON "tags"("tenantId", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "tags_deletedAt_idx" ON "tags"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "tags_tenantId_normalizedName_key" ON "tags"("tenantId", "normalizedName");

-- CreateIndex
CREATE INDEX "knowledge_base_tags_tagId_idx" ON "knowledge_base_tags"("tagId");

-- CreateIndex
CREATE INDEX "source_tags_tagId_idx" ON "source_tags"("tagId");

-- CreateIndex
CREATE INDEX "file_tags_tagId_idx" ON "file_tags"("tagId");

-- CreateIndex
CREATE INDEX "parser_profiles_tenantId_isDefault_idx" ON "parser_profiles"("tenantId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "parser_profiles_tenantId_name_key" ON "parser_profiles"("tenantId", "name");

-- CreateIndex
CREATE INDEX "parsed_documents_tenantId_organizationId_projectId_idx" ON "parsed_documents"("tenantId", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "parsed_documents_knowledgeBaseId_status_idx" ON "parsed_documents"("knowledgeBaseId", "status");

-- CreateIndex
CREATE INDEX "parsed_documents_sourceId_idx" ON "parsed_documents"("sourceId");

-- CreateIndex
CREATE INDEX "parsed_documents_fileId_status_idx" ON "parsed_documents"("fileId", "status");

-- CreateIndex
CREATE INDEX "parsed_documents_ingestionJobId_idx" ON "parsed_documents"("ingestionJobId");

-- CreateIndex
CREATE INDEX "parsed_documents_contentHash_idx" ON "parsed_documents"("contentHash");

-- CreateIndex
CREATE INDEX "parsed_documents_deletedAt_idx" ON "parsed_documents"("deletedAt");

-- CreateIndex
CREATE INDEX "chunking_configs_tenantId_isDefault_idx" ON "chunking_configs"("tenantId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "chunking_configs_tenantId_name_key" ON "chunking_configs"("tenantId", "name");

-- CreateIndex
CREATE INDEX "document_chunks_tenantId_organizationId_projectId_idx" ON "document_chunks"("tenantId", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "document_chunks_knowledgeBaseId_status_idx" ON "document_chunks"("knowledgeBaseId", "status");

-- CreateIndex
CREATE INDEX "document_chunks_sourceId_status_idx" ON "document_chunks"("sourceId", "status");

-- CreateIndex
CREATE INDEX "document_chunks_fileId_status_idx" ON "document_chunks"("fileId", "status");

-- CreateIndex
CREATE INDEX "document_chunks_contentHash_idx" ON "document_chunks"("contentHash");

-- CreateIndex
CREATE INDEX "document_chunks_deletedAt_idx" ON "document_chunks"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "document_chunks_parsedDocumentId_chunkIndex_key" ON "document_chunks"("parsedDocumentId", "chunkIndex");

-- CreateIndex
CREATE INDEX "chunk_keyword_indexes_tenantId_organizationId_projectId_idx" ON "chunk_keyword_indexes"("tenantId", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "chunk_keyword_indexes_knowledgeBaseId_idx" ON "chunk_keyword_indexes"("knowledgeBaseId");

-- CreateIndex
CREATE INDEX "chunk_keyword_indexes_sourceId_idx" ON "chunk_keyword_indexes"("sourceId");

-- CreateIndex
CREATE INDEX "chunk_keyword_indexes_fileId_idx" ON "chunk_keyword_indexes"("fileId");

-- CreateIndex
CREATE INDEX "chunk_keyword_indexes_contentHash_idx" ON "chunk_keyword_indexes"("contentHash");

-- CreateIndex
CREATE INDEX "embedding_models_provider_isActive_idx" ON "embedding_models"("provider", "isActive");

-- CreateIndex
CREATE INDEX "embedding_models_isDefault_idx" ON "embedding_models"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "embedding_models_provider_modelName_dimension_key" ON "embedding_models"("provider", "modelName", "dimension");

-- CreateIndex
CREATE INDEX "embedding_configs_tenantId_organizationId_projectId_idx" ON "embedding_configs"("tenantId", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "embedding_configs_knowledgeBaseId_isDefault_idx" ON "embedding_configs"("knowledgeBaseId", "isDefault");

-- CreateIndex
CREATE INDEX "embedding_configs_embeddingModelId_idx" ON "embedding_configs"("embeddingModelId");

-- CreateIndex
CREATE UNIQUE INDEX "embedding_configs_tenantId_name_key" ON "embedding_configs"("tenantId", "name");

-- CreateIndex
CREATE INDEX "qdrant_collections_tenantId_organizationId_projectId_idx" ON "qdrant_collections"("tenantId", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "qdrant_collections_embeddingModelId_idx" ON "qdrant_collections"("embeddingModelId");

-- CreateIndex
CREATE INDEX "qdrant_collections_embeddingConfigId_idx" ON "qdrant_collections"("embeddingConfigId");

-- CreateIndex
CREATE INDEX "qdrant_collections_status_idx" ON "qdrant_collections"("status");

-- CreateIndex
CREATE INDEX "qdrant_collections_deletedAt_idx" ON "qdrant_collections"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "qdrant_collections_tenantId_name_key" ON "qdrant_collections"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "qdrant_collections_tenantId_alias_key" ON "qdrant_collections"("tenantId", "alias");

-- CreateIndex
CREATE INDEX "chunk_embeddings_tenantId_organizationId_projectId_idx" ON "chunk_embeddings"("tenantId", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "chunk_embeddings_knowledgeBaseId_status_idx" ON "chunk_embeddings"("knowledgeBaseId", "status");

-- CreateIndex
CREATE INDEX "chunk_embeddings_sourceId_idx" ON "chunk_embeddings"("sourceId");

-- CreateIndex
CREATE INDEX "chunk_embeddings_fileId_idx" ON "chunk_embeddings"("fileId");

-- CreateIndex
CREATE INDEX "chunk_embeddings_chunkId_idx" ON "chunk_embeddings"("chunkId");

-- CreateIndex
CREATE INDEX "chunk_embeddings_embeddingModelId_idx" ON "chunk_embeddings"("embeddingModelId");

-- CreateIndex
CREATE INDEX "chunk_embeddings_embeddingConfigId_idx" ON "chunk_embeddings"("embeddingConfigId");

-- CreateIndex
CREATE INDEX "chunk_embeddings_embeddedContentHash_idx" ON "chunk_embeddings"("embeddedContentHash");

-- CreateIndex
CREATE INDEX "chunk_embeddings_deletedAt_idx" ON "chunk_embeddings"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "chunk_embeddings_qdrantCollectionId_qdrantPointId_key" ON "chunk_embeddings"("qdrantCollectionId", "qdrantPointId");

-- CreateIndex
CREATE UNIQUE INDEX "chunk_embeddings_chunkId_embeddingConfigId_key" ON "chunk_embeddings"("chunkId", "embeddingConfigId");

-- CreateIndex
CREATE INDEX "vector_index_operations_tenantId_organizationId_projectId_idx" ON "vector_index_operations"("tenantId", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "vector_index_operations_qdrantCollectionId_status_idx" ON "vector_index_operations"("qdrantCollectionId", "status");

-- CreateIndex
CREATE INDEX "vector_index_operations_chunkEmbeddingId_idx" ON "vector_index_operations"("chunkEmbeddingId");

-- CreateIndex
CREATE INDEX "vector_index_operations_ingestionJobId_idx" ON "vector_index_operations"("ingestionJobId");

-- CreateIndex
CREATE INDEX "vector_index_operations_qdrantPointId_idx" ON "vector_index_operations"("qdrantPointId");

-- CreateIndex
CREATE INDEX "ingestion_jobs_tenantId_organizationId_projectId_idx" ON "ingestion_jobs"("tenantId", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "ingestion_jobs_knowledgeBaseId_status_idx" ON "ingestion_jobs"("knowledgeBaseId", "status");

-- CreateIndex
CREATE INDEX "ingestion_jobs_sourceId_status_idx" ON "ingestion_jobs"("sourceId", "status");

-- CreateIndex
CREATE INDEX "ingestion_jobs_fileId_status_idx" ON "ingestion_jobs"("fileId", "status");

-- CreateIndex
CREATE INDEX "ingestion_jobs_bullJobId_idx" ON "ingestion_jobs"("bullJobId");

-- CreateIndex
CREATE INDEX "ingestion_jobs_queueName_status_idx" ON "ingestion_jobs"("queueName", "status");

-- CreateIndex
CREATE INDEX "ingestion_jobs_createdAt_idx" ON "ingestion_jobs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ingestion_jobs_idempotencyKey_key" ON "ingestion_jobs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ingestion_attempts_tenantId_organizationId_projectId_idx" ON "ingestion_attempts"("tenantId", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "ingestion_attempts_ingestionJobId_status_idx" ON "ingestion_attempts"("ingestionJobId", "status");

-- CreateIndex
CREATE INDEX "ingestion_attempts_workerId_idx" ON "ingestion_attempts"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "ingestion_attempts_ingestionJobId_attemptNumber_key" ON "ingestion_attempts"("ingestionJobId", "attemptNumber");

-- CreateIndex
CREATE INDEX "reprocessing_batches_tenantId_organizationId_projectId_idx" ON "reprocessing_batches"("tenantId", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "reprocessing_batches_knowledgeBaseId_status_idx" ON "reprocessing_batches"("knowledgeBaseId", "status");

-- CreateIndex
CREATE INDEX "reprocessing_batches_type_reason_idx" ON "reprocessing_batches"("type", "reason");

-- CreateIndex
CREATE INDEX "reprocessing_batches_createdAt_idx" ON "reprocessing_batches"("createdAt");

-- CreateIndex
CREATE INDEX "processing_events_tenantId_organizationId_projectId_idx" ON "processing_events"("tenantId", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "processing_events_knowledgeBaseId_idx" ON "processing_events"("knowledgeBaseId");

-- CreateIndex
CREATE INDEX "processing_events_sourceId_idx" ON "processing_events"("sourceId");

-- CreateIndex
CREATE INDEX "processing_events_fileId_idx" ON "processing_events"("fileId");

-- CreateIndex
CREATE INDEX "processing_events_ingestionJobId_idx" ON "processing_events"("ingestionJobId");

-- CreateIndex
CREATE INDEX "processing_events_type_idx" ON "processing_events"("type");

-- CreateIndex
CREATE INDEX "processing_events_createdAt_idx" ON "processing_events"("createdAt");

-- CreateIndex
CREATE INDEX "rerank_models_provider_isActive_idx" ON "rerank_models"("provider", "isActive");

-- CreateIndex
CREATE INDEX "rerank_models_isDefault_idx" ON "rerank_models"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "rerank_models_provider_modelName_key" ON "rerank_models"("provider", "modelName");

-- CreateIndex
CREATE INDEX "retrieval_profiles_tenantId_organizationId_projectId_idx" ON "retrieval_profiles"("tenantId", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "retrieval_profiles_knowledgeBaseId_isDefault_idx" ON "retrieval_profiles"("knowledgeBaseId", "isDefault");

-- CreateIndex
CREATE INDEX "retrieval_profiles_searchType_idx" ON "retrieval_profiles"("searchType");

-- CreateIndex
CREATE UNIQUE INDEX "retrieval_profiles_tenantId_knowledgeBaseId_name_key" ON "retrieval_profiles"("tenantId", "knowledgeBaseId", "name");

-- CreateIndex
CREATE INDEX "retrieval_queries_tenantId_organizationId_projectId_idx" ON "retrieval_queries"("tenantId", "organizationId", "projectId");

-- CreateIndex
CREATE INDEX "retrieval_queries_knowledgeBaseId_createdAt_idx" ON "retrieval_queries"("knowledgeBaseId", "createdAt");

-- CreateIndex
CREATE INDEX "retrieval_queries_retrievalProfileId_idx" ON "retrieval_queries"("retrievalProfileId");

-- CreateIndex
CREATE INDEX "retrieval_queries_embeddingModelId_idx" ON "retrieval_queries"("embeddingModelId");

-- CreateIndex
CREATE INDEX "retrieval_queries_qdrantCollectionId_idx" ON "retrieval_queries"("qdrantCollectionId");

-- CreateIndex
CREATE INDEX "retrieval_queries_queryHash_idx" ON "retrieval_queries"("queryHash");

-- CreateIndex
CREATE INDEX "retrieval_queries_searchType_status_idx" ON "retrieval_queries"("searchType", "status");

-- CreateIndex
CREATE INDEX "retrieval_queries_createdAt_idx" ON "retrieval_queries"("createdAt");

-- CreateIndex
CREATE INDEX "retrieval_results_retrievalQueryId_idx" ON "retrieval_results"("retrievalQueryId");

-- CreateIndex
CREATE INDEX "retrieval_results_chunkId_idx" ON "retrieval_results"("chunkId");

-- CreateIndex
CREATE INDEX "retrieval_results_chunkEmbeddingId_idx" ON "retrieval_results"("chunkEmbeddingId");

-- CreateIndex
CREATE INDEX "retrieval_results_qdrantPointId_idx" ON "retrieval_results"("qdrantPointId");

-- CreateIndex
CREATE UNIQUE INDEX "retrieval_results_retrievalQueryId_rank_key" ON "retrieval_results"("retrievalQueryId", "rank");

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_parentSourceId_fkey" FOREIGN KEY ("parentSourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_storageObjectId_fkey" FOREIGN KEY ("storageObjectId") REFERENCES "storage_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_previousFileId_fkey" FOREIGN KEY ("previousFileId") REFERENCES "document_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base_tags" ADD CONSTRAINT "knowledge_base_tags_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base_tags" ADD CONSTRAINT "knowledge_base_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_tags" ADD CONSTRAINT "source_tags_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_tags" ADD CONSTRAINT "source_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_tags" ADD CONSTRAINT "file_tags_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "document_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_tags" ADD CONSTRAINT "file_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parsed_documents" ADD CONSTRAINT "parsed_documents_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parsed_documents" ADD CONSTRAINT "parsed_documents_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parsed_documents" ADD CONSTRAINT "parsed_documents_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "document_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parsed_documents" ADD CONSTRAINT "parsed_documents_parserProfileId_fkey" FOREIGN KEY ("parserProfileId") REFERENCES "parser_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parsed_documents" ADD CONSTRAINT "parsed_documents_ingestionJobId_fkey" FOREIGN KEY ("ingestionJobId") REFERENCES "ingestion_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "document_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_parsedDocumentId_fkey" FOREIGN KEY ("parsedDocumentId") REFERENCES "parsed_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_chunkingConfigId_fkey" FOREIGN KEY ("chunkingConfigId") REFERENCES "chunking_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunk_keyword_indexes" ADD CONSTRAINT "chunk_keyword_indexes_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "document_chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "embedding_configs" ADD CONSTRAINT "embedding_configs_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "embedding_configs" ADD CONSTRAINT "embedding_configs_embeddingModelId_fkey" FOREIGN KEY ("embeddingModelId") REFERENCES "embedding_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "embedding_configs" ADD CONSTRAINT "embedding_configs_chunkingConfigId_fkey" FOREIGN KEY ("chunkingConfigId") REFERENCES "chunking_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qdrant_collections" ADD CONSTRAINT "qdrant_collections_embeddingModelId_fkey" FOREIGN KEY ("embeddingModelId") REFERENCES "embedding_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qdrant_collections" ADD CONSTRAINT "qdrant_collections_embeddingConfigId_fkey" FOREIGN KEY ("embeddingConfigId") REFERENCES "embedding_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qdrant_collections" ADD CONSTRAINT "qdrant_collections_migratedFromId_fkey" FOREIGN KEY ("migratedFromId") REFERENCES "qdrant_collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunk_embeddings" ADD CONSTRAINT "chunk_embeddings_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "document_chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunk_embeddings" ADD CONSTRAINT "chunk_embeddings_embeddingModelId_fkey" FOREIGN KEY ("embeddingModelId") REFERENCES "embedding_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunk_embeddings" ADD CONSTRAINT "chunk_embeddings_embeddingConfigId_fkey" FOREIGN KEY ("embeddingConfigId") REFERENCES "embedding_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunk_embeddings" ADD CONSTRAINT "chunk_embeddings_qdrantCollectionId_fkey" FOREIGN KEY ("qdrantCollectionId") REFERENCES "qdrant_collections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vector_index_operations" ADD CONSTRAINT "vector_index_operations_qdrantCollectionId_fkey" FOREIGN KEY ("qdrantCollectionId") REFERENCES "qdrant_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vector_index_operations" ADD CONSTRAINT "vector_index_operations_chunkEmbeddingId_fkey" FOREIGN KEY ("chunkEmbeddingId") REFERENCES "chunk_embeddings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vector_index_operations" ADD CONSTRAINT "vector_index_operations_ingestionJobId_fkey" FOREIGN KEY ("ingestionJobId") REFERENCES "ingestion_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "document_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_embeddingConfigId_fkey" FOREIGN KEY ("embeddingConfigId") REFERENCES "embedding_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_reprocessingBatchId_fkey" FOREIGN KEY ("reprocessingBatchId") REFERENCES "reprocessing_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_attempts" ADD CONSTRAINT "ingestion_attempts_ingestionJobId_fkey" FOREIGN KEY ("ingestionJobId") REFERENCES "ingestion_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reprocessing_batches" ADD CONSTRAINT "reprocessing_batches_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reprocessing_batches" ADD CONSTRAINT "reprocessing_batches_fromEmbeddingConfigId_fkey" FOREIGN KEY ("fromEmbeddingConfigId") REFERENCES "embedding_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reprocessing_batches" ADD CONSTRAINT "reprocessing_batches_toEmbeddingConfigId_fkey" FOREIGN KEY ("toEmbeddingConfigId") REFERENCES "embedding_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_events" ADD CONSTRAINT "processing_events_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_events" ADD CONSTRAINT "processing_events_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "document_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_events" ADD CONSTRAINT "processing_events_ingestionJobId_fkey" FOREIGN KEY ("ingestionJobId") REFERENCES "ingestion_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrieval_profiles" ADD CONSTRAINT "retrieval_profiles_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrieval_profiles" ADD CONSTRAINT "retrieval_profiles_embeddingConfigId_fkey" FOREIGN KEY ("embeddingConfigId") REFERENCES "embedding_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrieval_profiles" ADD CONSTRAINT "retrieval_profiles_qdrantCollectionId_fkey" FOREIGN KEY ("qdrantCollectionId") REFERENCES "qdrant_collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrieval_profiles" ADD CONSTRAINT "retrieval_profiles_rerankModelId_fkey" FOREIGN KEY ("rerankModelId") REFERENCES "rerank_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrieval_queries" ADD CONSTRAINT "retrieval_queries_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrieval_queries" ADD CONSTRAINT "retrieval_queries_retrievalProfileId_fkey" FOREIGN KEY ("retrievalProfileId") REFERENCES "retrieval_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrieval_queries" ADD CONSTRAINT "retrieval_queries_embeddingModelId_fkey" FOREIGN KEY ("embeddingModelId") REFERENCES "embedding_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrieval_queries" ADD CONSTRAINT "retrieval_queries_qdrantCollectionId_fkey" FOREIGN KEY ("qdrantCollectionId") REFERENCES "qdrant_collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrieval_results" ADD CONSTRAINT "retrieval_results_retrievalQueryId_fkey" FOREIGN KEY ("retrievalQueryId") REFERENCES "retrieval_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrieval_results" ADD CONSTRAINT "retrieval_results_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "document_chunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrieval_results" ADD CONSTRAINT "retrieval_results_chunkEmbeddingId_fkey" FOREIGN KEY ("chunkEmbeddingId") REFERENCES "chunk_embeddings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
