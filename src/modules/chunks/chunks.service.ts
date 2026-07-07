import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
import { buildPaginatedResult } from "../../common/metadata/pagination.js";
import { serializeJsonResponse } from "../../common/metadata/json-response.js";
import { buildOrderBy } from "../../common/metadata/sorting.js";
import { PrismaService } from "../database/prisma.service.js";
import type {
  ListDocumentChunksQuery,
  ListFileChunksQuery,
} from "./dto/document-chunk-query.dto.js";

type DocumentChunkWhereInput = Prisma.DocumentChunkWhereInput;

/**
 * Read-only service for safe chunk debugging APIs.
 */
@Injectable()
export class ChunksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List tenant-scoped chunks.
   * @param query - List query.
   * @returns Paginated chunks.
   */
  async list(query: ListDocumentChunksQuery) {
    const where = buildListWhere(query);
    const [items, total] = await Promise.all([
      this.prisma.documentChunk.findMany({
        where,
        include: getChunkInclude(),
        orderBy: buildOrderBy(query, "createdAt"),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.documentChunk.count({ where }),
    ]);

    return buildPaginatedResult(
      items.map((item) => serializeChunk(item)),
      query,
      total
    );
  }

  /**
   * List chunks for one tenant-scoped file.
   * @param fileId - File ID.
   * @param query - List query.
   * @returns Paginated file chunks.
   */
  async listByFile(fileId: string, query: ListFileChunksQuery) {
    return this.list({
      ...query,
      fileId,
    });
  }

  /**
   * Get one tenant-scoped chunk.
   * @param id - Chunk ID.
   * @param tenantId - Tenant ID.
   * @returns Safe chunk response.
   */
  async getById(
    id: string,
    tenantId: string
  ): Promise<Record<string, unknown>> {
    const chunk = await this.prisma.documentChunk.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: getChunkInclude(),
    });

    if (!chunk) {
      throw new NotFoundException("Document chunk was not found.");
    }

    return serializeChunk(chunk);
  }

  /**
   * Get safe embedding metadata for one chunk.
   * @param chunkId - Chunk ID.
   * @param tenantId - Tenant ID.
   * @returns Safe embedding metadata.
   */
  async getEmbedding(
    chunkId: string,
    tenantId: string
  ): Promise<Record<string, unknown>> {
    const embedding = await this.prisma.chunkEmbedding.findFirst({
      where: {
        chunkId,
        tenantId,
        deletedAt: null,
      },
      include: {
        embeddingConfig: {
          select: {
            id: true,
            name: true,
          },
        },
        embeddingModel: {
          select: {
            id: true,
            provider: true,
            modelName: true,
            dimension: true,
            distanceMetric: true,
          },
        },
        qdrantCollection: {
          select: {
            id: true,
            name: true,
            vectorSize: true,
            distanceMetric: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!embedding) {
      throw new NotFoundException("Chunk embedding was not found.");
    }

    return serializeEmbedding(embedding);
  }
}

/**
 * Build list filters.
 * @param query - List query.
 * @returns Prisma where input.
 */
function buildListWhere(
  query: ListDocumentChunksQuery
): DocumentChunkWhereInput {
  return {
    tenantId: query.tenantId,
    organizationId: query.organizationId,
    projectId: query.projectId,
    knowledgeBaseId: query.knowledgeBaseId,
    sourceId: query.sourceId,
    fileId: query.fileId,
    parsedDocumentId: query.parsedDocumentId,
    chunkingConfigId: query.chunkingConfigId,
    status: query.status,
    contentHash: query.contentHash,
    deletedAt: null,
  };
}

/**
 * Get chunk include config.
 * @returns Prisma include config.
 */
function getChunkInclude() {
  return {
    chunkingConfig: {
      select: {
        id: true,
        name: true,
        strategy: true,
      },
    },
    embeddings: {
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        qdrantPointId: true,
        vectorDimension: true,
        embeddedAt: true,
        indexedAt: true,
      },
      orderBy: {
        createdAt: "desc" as const,
      },
      take: 1,
    },
  };
}

/**
 * Serialize a chunk without full text.
 * @param chunk - Prisma chunk record.
 * @returns Safe chunk response.
 */
function serializeChunk(chunk: unknown): Record<string, unknown> {
  const serialized = serializeJsonResponse(chunk) as Record<string, any>;
  const embeddings = Array.isArray(serialized.embeddings)
    ? serialized.embeddings
    : [];

  return {
    id: serialized.id,
    tenantId: serialized.tenantId,
    organizationId: serialized.organizationId,
    projectId: serialized.projectId,
    knowledgeBaseId: serialized.knowledgeBaseId,
    sourceId: serialized.sourceId,
    fileId: serialized.fileId,
    parsedDocumentId: serialized.parsedDocumentId,
    chunkingConfigId: serialized.chunkingConfigId,
    chunkIndex: serialized.chunkIndex,
    textPreview: serialized.textPreview,
    tokenCount: serialized.tokenCount,
    charCount: serialized.charCount,
    startChar: serialized.startChar,
    endChar: serialized.endChar,
    pageStart: serialized.pageStart,
    pageEnd: serialized.pageEnd,
    headingPath: serialized.headingPath,
    contentHash: serialized.contentHash,
    metadata: serialized.metadata,
    status: serialized.status,
    chunkingConfig: serialized.chunkingConfig,
    latestEmbedding: embeddings[0]
      ? serializeLatestChunkEmbedding(embeddings[0] as Record<string, any>)
      : null,
    createdAt: serialized.createdAt,
    updatedAt: serialized.updatedAt,
  };
}

/**
 * Serialize latest chunk embedding metadata without vectors.
 * @param embedding - Latest embedding record.
 * @returns Safe embedding summary.
 */
function serializeLatestChunkEmbedding(
  embedding: Record<string, any>
): Record<string, unknown> {
  return {
    id: embedding.id,
    status: embedding.status,
    qdrantPointId: embedding.qdrantPointId,
    vectorDimension: embedding.vectorDimension,
    embeddedAt: embedding.embeddedAt,
    indexedAt: embedding.indexedAt,
  };
}

/**
 * Serialize embedding metadata without vectors.
 * @param embedding - Prisma embedding record.
 * @returns Safe embedding response.
 */
function serializeEmbedding(embedding: unknown): Record<string, unknown> {
  const serialized = serializeJsonResponse(embedding) as Record<string, any>;

  return {
    id: serialized.id,
    tenantId: serialized.tenantId,
    knowledgeBaseId: serialized.knowledgeBaseId,
    sourceId: serialized.sourceId,
    fileId: serialized.fileId,
    chunkId: serialized.chunkId,
    embeddingConfigId: serialized.embeddingConfigId,
    embeddingModelId: serialized.embeddingModelId,
    qdrantCollectionId: serialized.qdrantCollectionId,
    qdrantPointId: serialized.qdrantPointId,
    vectorDimension: serialized.vectorDimension,
    embeddedContentHash: serialized.embeddedContentHash,
    payloadHash: serialized.payloadHash,
    status: serialized.status,
    embeddedAt: serialized.embeddedAt,
    indexedAt: serialized.indexedAt,
    lastSyncedAt: serialized.lastSyncedAt,
    embeddingConfig: serialized.embeddingConfig,
    embeddingModel: serialized.embeddingModel,
    qdrantCollection: serialized.qdrantCollection,
    createdAt: serialized.createdAt,
    updatedAt: serialized.updatedAt,
  };
}
