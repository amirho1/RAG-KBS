import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { Prisma } from "../../../generated/prisma/client.js";
import {
  ChunkStatus,
  EmbeddingStatus,
} from "../../../generated/prisma/enums.js";
import { toPrismaNullableJson } from "../../../common/metadata/prisma-json.js";
import { normalizeTagName } from "../../../common/metadata/name-normalization.js";
import { PinoLoggerService } from "../../../common/logger/pino-logger.service.js";
import { ChunkingConfigService } from "../../chunking/services/chunking-config.service.js";
import { ChunkingService } from "../../chunking/services/chunking.service.js";
import type { ChunkTextResult } from "../../chunking/chunking.types.js";
import { IndexingDefaultsService } from "../../database/indexing-defaults.service.js";
import { PrismaService } from "../../database/prisma.service.js";
import { EmbeddingConfigService } from "../../embeddings/services/embedding-config.service.js";
import { EmbeddingsService } from "../../embeddings/services/embeddings.service.js";
import { QdrantCollectionService } from "../../qdrant/services/qdrant-collection.service.js";
import { QdrantPayloadService } from "../../qdrant/services/qdrant-payload.service.js";
import { QdrantService } from "../../qdrant/services/qdrant.service.js";
import type { QdrantUpsertPoint } from "../../qdrant/qdrant.types.js";
import {
  createNonRetryableIngestionError,
  createRetryableIngestionError,
} from "../ingestion.types.js";

type IndexParsedDocumentInput = {
  tenantId: string;
  parsedDocumentId: string;
  ingestionJobId: string;
  bullJobId?: string | number;
  queueName?: string;
  force: boolean;
};

type ParsedDocumentForIndexing = {
  id: string;
  tenantId: string;
  organizationId?: string | null;
  projectId?: string | null;
  knowledgeBaseId: string;
  sourceId: string;
  fileId: string;
  extractedText?: string | null;
  textPreview?: string | null;
  contentHash?: string | null;
  title?: string | null;
  language?: string | null;
  mimeType?: string | null;
  source?: {
    type?: string | null;
    description?: string | null;
    tags?: Array<{
      tag?: { name: string; normalizedName?: string | null } | null;
    }>;
  } | null;
  file?: {
    fileType?: string | null;
    mimeType?: string | null;
    title?: string | null;
    description?: string | null;
    language?: string | null;
    tags?: Array<{
      tag?: { name: string; normalizedName?: string | null } | null;
    }>;
  } | null;
};

type PersistedChunk = {
  id: string;
  tenantId: string;
  organizationId?: string | null;
  projectId?: string | null;
  knowledgeBaseId: string;
  sourceId: string;
  fileId: string;
  parsedDocumentId: string;
  chunkingConfigId?: string | null;
  chunkIndex: number;
  textPreview: string;
  tokenCount?: number | null;
  startChar?: number | null;
  endChar?: number | null;
  pageStart?: number | null;
  pageEnd?: number | null;
  headingPath?: unknown;
  contentHash: string;
  status: ChunkStatus;
  createdAt: Date;
  updatedAt: Date;
};

type ChunkWithText = {
  chunk: PersistedChunk;
  text: string;
};

type EmbeddingConfigWithModel = Awaited<
  ReturnType<EmbeddingConfigService["getDefaultConfig"]>
>;

/**
 * Orchestrates chunking, embedding, Qdrant upserts, and embedding metadata.
 */
@Injectable()
export class IndexingPipelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly indexingDefaultsService: IndexingDefaultsService,
    private readonly chunkingConfigService: ChunkingConfigService,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingConfigService: EmbeddingConfigService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly qdrantCollectionService: QdrantCollectionService,
    private readonly qdrantPayloadService: QdrantPayloadService,
    private readonly qdrantService: QdrantService,
    private readonly logger: PinoLoggerService
  ) {}

  /**
   * Index a parsed document into PostgreSQL chunk metadata and Qdrant vectors.
   * @param input - Indexing input.
   * @returns Indexing counts.
   */
  async indexParsedDocument(input: IndexParsedDocumentInput): Promise<{
    chunkCount: number;
    embeddedCount: number;
  }> {
    await this.indexingDefaultsService.ensureTenantDefaults(input.tenantId);

    const parsedDocument = await this.loadParsedDocument(input);
    const text = getParsedDocumentText(parsedDocument);

    if (text.length === 0) {
      throw createNonRetryableIngestionError(
        "EMPTY_PARSED_DOCUMENT",
        "The parsed document does not contain text to index."
      );
    }

    const chunkingConfig = await this.loadChunkingConfig(input.tenantId);

    this.logger.info({
      event: "chunking.started",
      jobId: input.ingestionJobId,
      bullJobId: input.bullJobId,
      queueName: input.queueName,
      tenantId: input.tenantId,
      knowledgeBaseId: parsedDocument.knowledgeBaseId,
      sourceId: parsedDocument.sourceId,
      fileId: parsedDocument.fileId,
      parsedDocumentId: parsedDocument.id,
      chunkingConfigId: chunkingConfig.id,
    });

    const chunkResults = await this.chunkDocument(
      parsedDocument,
      text,
      chunkingConfig
    );
    const chunks = await this.persistChunks(
      parsedDocument,
      chunkingConfig.id,
      chunkResults,
      input.force
    );

    this.logger.info({
      event: "chunking.completed",
      jobId: input.ingestionJobId,
      tenantId: input.tenantId,
      parsedDocumentId: parsedDocument.id,
      chunkingConfigId: chunkingConfig.id,
      chunkCount: chunks.length,
    });

    const embeddingConfig = await this.loadEmbeddingConfig(input.tenantId);
    const qdrantCollection =
      await this.qdrantCollectionService.getDefaultWriteCollection(
        input.tenantId
      );

    await this.ensureQdrantCollection(input, qdrantCollection);

    const chunksToEmbed = await this.filterChunksNeedingEmbedding(
      chunks,
      embeddingConfig.id,
      input.force
    );

    if (chunksToEmbed.length === 0) {
      return {
        chunkCount: chunks.length,
        embeddedCount: 0,
      };
    }

    const embeddedCount = await this.embedAndUpsertChunks({
      input,
      parsedDocument,
      chunks: chunksToEmbed,
      embeddingConfig,
      qdrantCollection,
    });

    this.logger.info({
      event: "indexing.completed",
      jobId: input.ingestionJobId,
      tenantId: input.tenantId,
      parsedDocumentId: parsedDocument.id,
      chunkCount: chunks.length,
      embeddedCount,
      status: "INDEXED",
    });

    return {
      chunkCount: chunks.length,
      embeddedCount,
    };
  }

  /**
   * Load a parsed document with metadata needed for Qdrant payloads.
   * @param input - Indexing input.
   * @returns Parsed document.
   */
  private async loadParsedDocument(
    input: IndexParsedDocumentInput
  ): Promise<ParsedDocumentForIndexing> {
    const parsedDocument = await this.prisma.parsedDocument.findFirst({
      where: {
        id: input.parsedDocumentId,
        tenantId: input.tenantId,
        deletedAt: null,
      },
      include: {
        source: {
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
        file: {
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
    });

    if (!parsedDocument) {
      throw createNonRetryableIngestionError(
        "PARSED_DOCUMENT_NOT_FOUND",
        "The parsed document for indexing was not found."
      );
    }

    return parsedDocument;
  }

  /**
   * Load the default chunking config.
   * @param tenantId - Tenant ID.
   * @returns Chunking config.
   */
  private async loadChunkingConfig(tenantId: string) {
    try {
      return await this.chunkingConfigService.getDefaultConfig(tenantId);
    } catch {
      throw createNonRetryableIngestionError(
        "CHUNKING_CONFIG_NOT_FOUND",
        "The default chunking config was not found."
      );
    }
  }

  /**
   * Load the default embedding config.
   * @param tenantId - Tenant ID.
   * @returns Embedding config with model.
   */
  private async loadEmbeddingConfig(
    tenantId: string
  ): Promise<EmbeddingConfigWithModel> {
    try {
      return await this.embeddingConfigService.getDefaultConfig(tenantId);
    } catch {
      throw createNonRetryableIngestionError(
        "EMBEDDING_CONFIG_NOT_FOUND",
        "The default embedding config was not found."
      );
    }
  }

  /**
   * Chunk a parsed document.
   * @param parsedDocument - Parsed document.
   * @param text - Text to chunk.
   * @param chunkingConfig - Chunking config.
   * @returns Chunk results.
   */
  private async chunkDocument(
    parsedDocument: ParsedDocumentForIndexing,
    text: string,
    chunkingConfig: Awaited<
      ReturnType<ChunkingConfigService["getDefaultConfig"]>
    >
  ): Promise<ChunkTextResult[]> {
    try {
      return await this.chunkingService.chunkText({
        parsedDocumentId: parsedDocument.id,
        text,
        config: chunkingConfig,
      });
    } catch {
      throw createNonRetryableIngestionError(
        "CHUNKING_FAILED",
        "The parsed document could not be chunked."
      );
    }
  }

  /**
   * Persist chunk metadata without full text.
   * @param parsedDocument - Parsed document.
   * @param chunkingConfigId - Chunking config ID.
   * @param chunkResults - Chunking results.
   * @param force - Whether to refresh unchanged chunks.
   * @returns Persisted chunks paired with full text for embedding.
   */
  private async persistChunks(
    parsedDocument: ParsedDocumentForIndexing,
    chunkingConfigId: string,
    chunkResults: ChunkTextResult[],
    force: boolean
  ): Promise<ChunkWithText[]> {
    const uniqueChunks = dedupeChunkResults(chunkResults);
    const contentHashes = uniqueChunks.map((chunk) => chunk.contentHash);

    return this.prisma.$transaction(async (tx) => {
      await tx.documentChunk.updateMany({
        where: {
          parsedDocumentId: parsedDocument.id,
          chunkingConfigId,
          deletedAt: null,
          contentHash: {
            notIn: contentHashes,
          },
        },
        data: {
          status: ChunkStatus.SUPERSEDED,
          deletedAt: new Date(),
        },
      });

      const persistedChunks: ChunkWithText[] = [];

      for (const chunkResult of uniqueChunks) {
        const existingChunk = await tx.documentChunk.findFirst({
          where: {
            parsedDocumentId: parsedDocument.id,
            chunkingConfigId,
            contentHash: chunkResult.contentHash,
            deletedAt: null,
          },
        });

        if (existingChunk && !force) {
          persistedChunks.push({
            chunk: existingChunk,
            text: chunkResult.text,
          });
          continue;
        }

        const data = buildChunkData(
          parsedDocument,
          chunkingConfigId,
          chunkResult
        );
        const chunk = existingChunk
          ? await tx.documentChunk.update({
              where: { id: existingChunk.id },
              data,
            })
          : await tx.documentChunk.create({ data });

        persistedChunks.push({
          chunk: chunk,
          text: chunkResult.text,
        });
      }

      return persistedChunks;
    });
  }

  /**
   * Ensure Qdrant collection exists.
   * @param input - Indexing input.
   * @param qdrantCollection - Collection metadata.
   */
  private async ensureQdrantCollection(
    input: IndexParsedDocumentInput,
    qdrantCollection: Awaited<
      ReturnType<QdrantCollectionService["getDefaultWriteCollection"]>
    >
  ): Promise<void> {
    this.logger.info({
      event: "qdrant.collection.ensure_started",
      jobId: input.ingestionJobId,
      tenantId: input.tenantId,
      qdrantCollectionId: qdrantCollection.id,
    });

    try {
      await this.qdrantService.ensureCollectionExists({
        qdrantName: qdrantCollection.name,
        vectorSize: qdrantCollection.vectorSize,
        distanceMetric: qdrantCollection.distanceMetric,
      });
    } catch {
      throw createRetryableIngestionError(
        "QDRANT_COLLECTION_CREATE_FAILED",
        "The Qdrant collection could not be prepared."
      );
    }

    this.logger.info({
      event: "qdrant.collection.ready",
      jobId: input.ingestionJobId,
      tenantId: input.tenantId,
      qdrantCollectionId: qdrantCollection.id,
    });
  }

  /**
   * Keep only chunks that need embedding.
   * @param chunks - Persisted chunks.
   * @param embeddingConfigId - Embedding config ID.
   * @param force - Whether to force embedding.
   * @returns Chunks to embed.
   */
  private async filterChunksNeedingEmbedding(
    chunks: ChunkWithText[],
    embeddingConfigId: string,
    force: boolean
  ): Promise<ChunkWithText[]> {
    if (force || chunks.length === 0) {
      return chunks;
    }

    const existingEmbeddings = await this.prisma.chunkEmbedding.findMany({
      where: {
        chunkId: {
          in: chunks.map(({ chunk }) => chunk.id),
        },
        embeddingConfigId,
        status: EmbeddingStatus.INDEXED,
        deletedAt: null,
      },
      select: {
        chunkId: true,
        embeddedContentHash: true,
      },
    });
    const embeddedContentHashByChunkId = new Map(
      existingEmbeddings.map((embedding) => [
        embedding.chunkId,
        embedding.embeddedContentHash,
      ])
    );

    return chunks.filter(({ chunk }) => {
      return embeddedContentHashByChunkId.get(chunk.id) !== chunk.contentHash;
    });
  }

  /**
   * Embed chunks, upsert vectors, and save embedding references.
   * @param work - Indexing work input.
   * @returns Embedded chunk count.
   */
  private async embedAndUpsertChunks(work: {
    input: IndexParsedDocumentInput;
    parsedDocument: ParsedDocumentForIndexing;
    chunks: ChunkWithText[];
    embeddingConfig: EmbeddingConfigWithModel;
    qdrantCollection: Awaited<
      ReturnType<QdrantCollectionService["getDefaultWriteCollection"]>
    >;
  }): Promise<number> {
    let embeddedCount = 0;

    for (const batch of chunkArray(
      work.chunks,
      this.embeddingsService.getBatchSize()
    )) {
      const embeddingResult = await this.embedBatch(work, batch);
      const upsertWork = batch.map((chunkWithText, index) => {
        const embedding = embeddingResult.embeddings[index];

        return buildUpsertWork({
          parsedDocument: work.parsedDocument,
          chunkWithText,
          embeddingVector: embedding.vector,
          embeddingConfig: work.embeddingConfig,
          qdrantCollection: work.qdrantCollection,
          qdrantPayloadService: this.qdrantPayloadService,
        });
      });

      await this.upsertBatch(work, upsertWork);
      await this.saveEmbeddingReferences(work, upsertWork);
      embeddedCount += upsertWork.length;
    }

    return embeddedCount;
  }

  /**
   * Embed one chunk batch.
   * @param work - Indexing work input.
   * @param batch - Chunk batch.
   * @returns Embedding batch result.
   */
  private async embedBatch(
    work: {
      input: IndexParsedDocumentInput;
      embeddingConfig: EmbeddingConfigWithModel;
    },
    batch: ChunkWithText[]
  ) {
    this.logger.info({
      event: "embedding.started",
      jobId: work.input.ingestionJobId,
      tenantId: work.input.tenantId,
      embeddingConfigId: work.embeddingConfig.id,
      embeddingModelId: work.embeddingConfig.embeddingModelId,
      embeddingBatchSize: batch.length,
    });

    try {
      const result = await this.embeddingsService.embedBatch(
        batch.map(({ text }) => text),
        work.embeddingConfig.embeddingModel.dimension,
        work.embeddingConfig.embeddingModel.provider
      );

      this.logger.info({
        event: "embedding.batch.completed",
        jobId: work.input.ingestionJobId,
        tenantId: work.input.tenantId,
        embeddingConfigId: work.embeddingConfig.id,
        embeddingBatchSize: batch.length,
      });

      return result;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "EMBEDDING_DIMENSION_MISMATCH"
      ) {
        throw createRetryableIngestionError(
          "EMBEDDING_DIMENSION_MISMATCH",
          "The embedding provider returned an unexpected vector dimension."
        );
      }

      throw createRetryableIngestionError(
        "EMBEDDING_PROVIDER_FAILED",
        "The embedding provider failed while embedding chunks."
      );
    }
  }

  /**
   * Upsert one point batch to Qdrant.
   * @param work - Indexing work input.
   * @param upsertWork - Prepared upsert work.
   */
  private async upsertBatch(
    work: {
      input: IndexParsedDocumentInput;
      qdrantCollection: Awaited<
        ReturnType<QdrantCollectionService["getDefaultWriteCollection"]>
      >;
    },
    upsertWork: Array<ReturnType<typeof buildUpsertWork>>
  ): Promise<void> {
    const points: QdrantUpsertPoint[] = upsertWork.map((item) => ({
      id: item.qdrantPointId,
      vector: item.vector,
      payload: item.payload,
    }));

    this.logger.info({
      event: "qdrant.upsert.started",
      jobId: work.input.ingestionJobId,
      tenantId: work.input.tenantId,
      qdrantCollectionId: work.qdrantCollection.id,
      chunkCount: points.length,
    });

    try {
      await this.qdrantService.upsertPoints(work.qdrantCollection.name, points);
    } catch {
      throw createRetryableIngestionError(
        "QDRANT_UPSERT_FAILED",
        "Chunk vectors could not be upserted into Qdrant."
      );
    }

    this.logger.info({
      event: "qdrant.upsert.completed",
      jobId: work.input.ingestionJobId,
      tenantId: work.input.tenantId,
      qdrantCollectionId: work.qdrantCollection.id,
      chunkCount: points.length,
    });
  }

  /**
   * Save embedding references after Qdrant upsert succeeds.
   * @param work - Indexing work input.
   * @param upsertWork - Upsert work.
   */
  private async saveEmbeddingReferences(
    work: {
      input: IndexParsedDocumentInput;
      embeddingConfig: EmbeddingConfigWithModel;
      qdrantCollection: Awaited<
        ReturnType<QdrantCollectionService["getDefaultWriteCollection"]>
      >;
    },
    upsertWork: Array<ReturnType<typeof buildUpsertWork>>
  ): Promise<void> {
    const now = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const item of upsertWork) {
          await tx.chunkEmbedding.upsert({
            where: {
              chunkId_embeddingConfigId: {
                chunkId: item.chunk.id,
                embeddingConfigId: work.embeddingConfig.id,
              },
            },
            create: {
              id: item.chunkEmbeddingId,
              tenantId: item.chunk.tenantId,
              organizationId: item.chunk.organizationId,
              projectId: item.chunk.projectId,
              knowledgeBaseId: item.chunk.knowledgeBaseId,
              sourceId: item.chunk.sourceId,
              fileId: item.chunk.fileId,
              chunkId: item.chunk.id,
              embeddingModelId: work.embeddingConfig.embeddingModelId,
              embeddingConfigId: work.embeddingConfig.id,
              qdrantCollectionId: work.qdrantCollection.id,
              qdrantPointId: item.qdrantPointId,
              status: EmbeddingStatus.INDEXED,
              vectorDimension: item.vector.length,
              embeddedContentHash: item.chunk.contentHash,
              payloadHash: item.payloadHash,
              embeddedAt: now,
              indexedAt: now,
              lastSyncedAt: now,
            },
            update: {
              embeddingModelId: work.embeddingConfig.embeddingModelId,
              qdrantCollectionId: work.qdrantCollection.id,
              qdrantPointId: item.qdrantPointId,
              status: EmbeddingStatus.INDEXED,
              vectorDimension: item.vector.length,
              embeddedContentHash: item.chunk.contentHash,
              payloadHash: item.payloadHash,
              embeddedAt: now,
              indexedAt: now,
              lastSyncedAt: now,
              errorCode: null,
              errorMessage: null,
            },
          });

          await tx.documentChunk.update({
            where: { id: item.chunk.id },
            data: {
              status: ChunkStatus.EMBEDDED,
            },
          });
        }
      });
    } catch {
      this.logger.errorPayload({
        event: "chunk_embedding.created",
        jobId: work.input.ingestionJobId,
        tenantId: work.input.tenantId,
        status: "FAILED",
        errorCode: "CHUNK_EMBEDDING_SAVE_FAILED",
      });

      throw createRetryableIngestionError(
        "CHUNK_EMBEDDING_SAVE_FAILED",
        "Chunk embedding metadata could not be saved after Qdrant upsert."
      );
    }

    this.logger.info({
      event: "chunk_embedding.created",
      jobId: work.input.ingestionJobId,
      tenantId: work.input.tenantId,
      chunkCount: upsertWork.length,
      status: EmbeddingStatus.INDEXED,
    });
  }
}

/**
 * Get indexable text from a parsed document.
 * @param parsedDocument - Parsed document.
 * @returns Parsed text.
 */
function getParsedDocumentText(
  parsedDocument: ParsedDocumentForIndexing
): string {
  return (
    parsedDocument.extractedText ??
    parsedDocument.textPreview ??
    ""
  ).trim();
}

/**
 * Deduplicate chunks by content hash.
 * @param chunks - Chunk results.
 * @returns Unique chunks.
 */
function dedupeChunkResults(chunks: ChunkTextResult[]): ChunkTextResult[] {
  const seen = new Set<string>();
  const uniqueChunks: ChunkTextResult[] = [];

  for (const chunk of chunks) {
    if (seen.has(chunk.contentHash)) {
      continue;
    }

    seen.add(chunk.contentHash);
    uniqueChunks.push({
      ...chunk,
      chunkIndex: uniqueChunks.length,
    });
  }

  return uniqueChunks;
}

/**
 * Build chunk persistence data.
 * @param parsedDocument - Parsed document.
 * @param chunkingConfigId - Chunking config ID.
 * @param chunk - Chunk result.
 * @returns Prisma chunk data.
 */
function buildChunkData(
  parsedDocument: ParsedDocumentForIndexing,
  chunkingConfigId: string,
  chunk: ChunkTextResult
): Prisma.DocumentChunkUncheckedCreateInput {
  return {
    tenantId: parsedDocument.tenantId,
    organizationId: parsedDocument.organizationId,
    projectId: parsedDocument.projectId,
    knowledgeBaseId: parsedDocument.knowledgeBaseId,
    sourceId: parsedDocument.sourceId,
    fileId: parsedDocument.fileId,
    parsedDocumentId: parsedDocument.id,
    chunkingConfigId,
    chunkIndex: chunk.chunkIndex,
    contentHash: chunk.contentHash,
    text: null,
    textPreview: chunk.textPreview,
    tokenCount: chunk.tokenCount,
    charCount: chunk.text.length,
    startChar: chunk.charStart,
    endChar: chunk.charEnd,
    headingPath: chunk.headingPath,
    metadata: toPrismaNullableJson({
      indexedFromParsedDocumentContentHash: parsedDocument.contentHash ?? null,
    }),
    status: ChunkStatus.NEEDS_EMBEDDING,
    deletedAt: null,
  };
}

/**
 * Build Qdrant upsert work for one chunk.
 * @param input - Build input.
 * @returns Prepared upsert work.
 */
function buildUpsertWork(input: {
  parsedDocument: ParsedDocumentForIndexing;
  chunkWithText: ChunkWithText;
  embeddingVector: number[];
  embeddingConfig: EmbeddingConfigWithModel;
  qdrantCollection: Awaited<
    ReturnType<QdrantCollectionService["getDefaultWriteCollection"]>
  >;
  qdrantPayloadService: QdrantPayloadService;
}) {
  const { chunk, text } = input.chunkWithText;
  const qdrantPointId = createDeterministicUuid(
    `${input.qdrantCollection.id}:${chunk.id}:${input.embeddingConfig.id}`
  );
  const chunkEmbeddingId = createDeterministicUuid(
    `chunk-embedding:${qdrantPointId}`
  );
  const payload = input.qdrantPayloadService.buildPayload({
    tenantId: chunk.tenantId,
    organizationId: chunk.organizationId,
    projectId: chunk.projectId,
    knowledgeBaseId: chunk.knowledgeBaseId,
    sourceId: chunk.sourceId,
    fileId: chunk.fileId,
    parsedDocumentId: chunk.parsedDocumentId,
    chunkId: chunk.id,
    chunkEmbeddingId,
    qdrantCollectionId: input.qdrantCollection.id,
    sourceType: input.parsedDocument.source?.type,
    fileType: input.parsedDocument.file?.fileType,
    mimeType:
      input.parsedDocument.file?.mimeType ?? input.parsedDocument.mimeType,
    language:
      input.parsedDocument.file?.language ?? input.parsedDocument.language,
    tags: getTags(input.parsedDocument),
    title: input.parsedDocument.file?.title ?? input.parsedDocument.title,
    description:
      input.parsedDocument.file?.description ??
      input.parsedDocument.source?.description,
    chunkIndex: chunk.chunkIndex,
    pageStart: chunk.pageStart,
    pageEnd: chunk.pageEnd,
    headingPath: chunk.headingPath,
    text,
    textPreview: chunk.textPreview,
    contentHash: chunk.contentHash,
    embeddedContentHash: chunk.contentHash,
    createdAt: chunk.createdAt,
    updatedAt: chunk.updatedAt,
  });
  const payloadHash = input.qdrantPayloadService.createPayloadHash(payload);

  return {
    chunk,
    vector: input.embeddingVector,
    qdrantPointId,
    chunkEmbeddingId,
    payload,
    payloadHash,
  };
}

/**
 * Collect source and file tag names.
 * @param parsedDocument - Parsed document.
 * @returns Unique tag names.
 */
function getTags(parsedDocument: ParsedDocumentForIndexing): string[] {
  const tagNames = [
    ...(parsedDocument.source?.tags ?? []).map((tagLink) =>
      getPayloadTagName(tagLink.tag)
    ),
    ...(parsedDocument.file?.tags ?? []).map((tagLink) =>
      getPayloadTagName(tagLink.tag)
    ),
  ].filter((name): name is string => typeof name === "string");

  return [...new Set(tagNames)];
}

/**
 * Get the normalized tag name for Qdrant payload filters.
 * @param tag - Tag record.
 * @returns Normalized tag name.
 */
function getPayloadTagName(
  tag: { name: string; normalizedName?: string | null } | null | undefined
): string | undefined {
  if (!tag) {
    return undefined;
  }

  return tag.normalizedName ?? normalizeTagName(tag.name);
}

/**
 * Split values into batches.
 * @param values - Values to split.
 * @param batchSize - Batch size.
 * @returns Batches.
 */
function chunkArray<T>(values: T[], batchSize: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += batchSize) {
    chunks.push(values.slice(index, index + batchSize));
  }

  return chunks;
}

/**
 * Create a deterministic UUID from text.
 * @param value - Source value.
 * @returns UUID string.
 */
function createDeterministicUuid(value: string): string {
  const bytes = createHash("sha256")
    .update(value, "utf8")
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
