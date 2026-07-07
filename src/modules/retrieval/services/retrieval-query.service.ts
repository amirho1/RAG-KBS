import { createHash } from "node:crypto";
import { HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { serializeJsonResponse } from "../../../common/metadata/json-response.js";
import { toPrismaNullableJson } from "../../../common/metadata/prisma-json.js";
import {
  KnowledgeBaseStatus,
  RetrievalSearchType,
  RetrievalStatus,
} from "../../../generated/prisma/enums.js";
import { PrismaService } from "../../database/prisma.service.js";
import { retrievalSafeErrorMessages } from "../retrieval.constants.js";
import type {
  NormalizedRetrievalFilters,
  RetrievalErrorCode,
  RetrievalQueryOptions,
  RetrievalScopeValidation,
} from "../retrieval.types.js";
import { RetrievalException } from "../retrieval.types.js";
import type { RetrievalQueryInput } from "../dto/retrieval-query.dto.js";

type CreatePendingRetrievalQueryInput = {
  data: RetrievalQueryInput;
  normalizedQuery: string;
  queryHash: string;
  filters: Record<string, unknown>;
  options: RetrievalQueryOptions;
  requestId?: string;
  storeQueryText: boolean;
};

type RetrievalExecutionTargets = {
  embeddingModelId: string;
  embeddingConfigId: string;
  qdrantCollectionId: string;
};

type CompleteRetrievalQueryInput = {
  queryId: string;
  resultCount: number;
  latencyMs: number;
  qdrantLatencyMs: number;
};

type FailRetrievalQueryInput = {
  queryId: string;
  errorCode: RetrievalErrorCode;
  errorMessage: string;
  latencyMs: number;
};

/**
 * Validates retrieval scope and persists retrieval query records.
 */
@Injectable()
export class RetrievalQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate tenant, knowledge base, and optional metadata filter ownership.
   * @param tenantId - Tenant ID.
   * @param knowledgeBaseId - Knowledge base ID.
   * @param filters - Normalized request filters.
   * @returns Scope validation details used for Qdrant filtering.
   */
  async validateScope(
    tenantId: string,
    knowledgeBaseId: string,
    filters: NormalizedRetrievalFilters
  ): Promise<RetrievalScopeValidation> {
    await this.ensureKnowledgeBaseExists(tenantId, knowledgeBaseId);
    await this.ensureSourceIdsExist(
      tenantId,
      knowledgeBaseId,
      filters.sourceIds
    );
    await this.ensureFileIdsExist(tenantId, knowledgeBaseId, filters.fileIds);
    const tagFilterValues = await this.resolveTagFilterValues(
      tenantId,
      filters.tags
    );

    return { tagFilterValues };
  }

  /**
   * Create a stable query hash from normalized query and filters.
   * @param value - Query hash value.
   * @returns SHA-256 query hash.
   */
  createQueryHash(value: Record<string, unknown>): string {
    return createHash("sha256")
      .update(stableStringify(value), "utf8")
      .digest("hex");
  }

  /**
   * Create an initial retrieval query record.
   * @param input - Pending query input.
   * @returns Query ID and creation time.
   */
  async createPendingQuery(input: CreatePendingRetrievalQueryInput) {
    const query = await this.prisma.retrievalQuery.create({
      data: {
        tenantId: input.data.tenantId,
        organizationId: input.data.organizationId,
        projectId: input.data.projectId,
        knowledgeBaseId: input.data.knowledgeBaseId,
        searchType: RetrievalSearchType.VECTOR,
        status: RetrievalStatus.FAILED,
        queryText: input.storeQueryText ? input.normalizedQuery : null,
        queryHash: input.queryHash,
        filters: toPrismaNullableJson(input.filters as never),
        topK: input.options.topK,
        scoreThreshold: input.options.scoreThreshold,
        resultCount: 0,
        requestId: input.requestId,
        metadata: toPrismaNullableJson(input.data.metadata),
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return query;
  }

  /**
   * Attach embedding and Qdrant execution targets to a query record.
   * @param queryId - Retrieval query ID.
   * @param targets - Execution target IDs.
   */
  async attachExecutionTargets(
    queryId: string,
    targets: RetrievalExecutionTargets
  ): Promise<void> {
    await this.prisma.retrievalQuery.update({
      where: {
        id: queryId,
      },
      data: targets,
    });
  }

  /**
   * Mark a retrieval query as completed.
   * @param input - Completion input.
   */
  async markCompleted(input: CompleteRetrievalQueryInput): Promise<void> {
    await this.prisma.retrievalQuery.update({
      where: {
        id: input.queryId,
      },
      data: {
        status: RetrievalStatus.SUCCESS,
        resultCount: input.resultCount,
        latencyMs: input.latencyMs,
        qdrantLatencyMs: input.qdrantLatencyMs,
        errorCode: null,
        errorMessage: null,
      },
    });
  }

  /**
   * Mark a retrieval query as failed with safe error details.
   * @param input - Failure input.
   */
  async markFailed(input: FailRetrievalQueryInput): Promise<void> {
    await this.prisma.retrievalQuery.update({
      where: {
        id: input.queryId,
      },
      data: {
        status: RetrievalStatus.FAILED,
        latencyMs: input.latencyMs,
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
      },
    });
  }

  /**
   * Get a tenant-scoped retrieval query debug record.
   * @param id - Retrieval query ID.
   * @param tenantId - Tenant ID.
   * @returns Safe debug response.
   */
  async getById(
    id: string,
    tenantId: string
  ): Promise<Record<string, unknown>> {
    const query = await this.prisma.retrievalQuery.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        results: {
          orderBy: {
            rank: "asc",
          },
        },
      },
    });

    if (!query) {
      throw new NotFoundException("Retrieval query was not found.");
    }

    return serializeRetrievalQueryDebug(query);
  }

  /**
   * Ensure a tenant-scoped active knowledge base exists.
   * @param tenantId - Tenant ID.
   * @param knowledgeBaseId - Knowledge base ID.
   */
  private async ensureKnowledgeBaseExists(
    tenantId: string,
    knowledgeBaseId: string
  ): Promise<void> {
    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: {
        id: knowledgeBaseId,
        tenantId,
        status: KnowledgeBaseStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!knowledgeBase) {
      throw new RetrievalException(
        "KNOWLEDGE_BASE_NOT_FOUND",
        retrievalSafeErrorMessages.KNOWLEDGE_BASE_NOT_FOUND,
        HttpStatus.NOT_FOUND
      );
    }
  }

  /**
   * Ensure source filters belong to the tenant-scoped knowledge base.
   * @param tenantId - Tenant ID.
   * @param knowledgeBaseId - Knowledge base ID.
   * @param sourceIds - Source IDs.
   */
  private async ensureSourceIdsExist(
    tenantId: string,
    knowledgeBaseId: string,
    sourceIds: string[]
  ): Promise<void> {
    if (sourceIds.length === 0) {
      return;
    }

    const count = await this.prisma.source.count({
      where: {
        id: {
          in: sourceIds,
        },
        tenantId,
        knowledgeBaseId,
        deletedAt: null,
      },
    });

    if (count !== sourceIds.length) {
      throwInvalidFilter();
    }
  }

  /**
   * Ensure file filters belong to the tenant-scoped knowledge base.
   * @param tenantId - Tenant ID.
   * @param knowledgeBaseId - Knowledge base ID.
   * @param fileIds - File IDs.
   */
  private async ensureFileIdsExist(
    tenantId: string,
    knowledgeBaseId: string,
    fileIds: string[]
  ): Promise<void> {
    if (fileIds.length === 0) {
      return;
    }

    const count = await this.prisma.documentFile.count({
      where: {
        id: {
          in: fileIds,
        },
        tenantId,
        knowledgeBaseId,
        deletedAt: null,
      },
    });

    if (count !== fileIds.length) {
      throwInvalidFilter();
    }
  }

  /**
   * Resolve tenant tag display and normalized names for Qdrant compatibility.
   * @param tenantId - Tenant ID.
   * @param normalizedTags - Normalized tag filter names.
   * @returns Tag values to include in Qdrant filters.
   */
  private async resolveTagFilterValues(
    tenantId: string,
    normalizedTags: string[]
  ): Promise<string[]> {
    if (normalizedTags.length === 0) {
      return [];
    }

    const tags = await this.prisma.tag.findMany({
      where: {
        tenantId,
        normalizedName: {
          in: normalizedTags,
        },
        deletedAt: null,
      },
      select: {
        name: true,
        normalizedName: true,
      },
    });

    if (tags.length !== normalizedTags.length) {
      throwInvalidFilter();
    }

    return [
      ...new Set(
        tags.flatMap((tag) => [tag.name, tag.normalizedName]).filter(Boolean)
      ),
    ];
  }
}

/**
 * Throw a safe invalid filter exception.
 */
function throwInvalidFilter(): never {
  throw new RetrievalException(
    "INVALID_RETRIEVAL_FILTER",
    retrievalSafeErrorMessages.INVALID_RETRIEVAL_FILTER,
    HttpStatus.BAD_REQUEST
  );
}

/**
 * Serialize a retrieval query debug response.
 * @param query - Retrieval query record with results.
 * @returns Safe debug response.
 */
function serializeRetrievalQueryDebug(query: unknown): Record<string, unknown> {
  const serialized = serializeJsonResponse(query) as Record<string, any>;
  const results = Array.isArray(serialized.results) ? serialized.results : [];

  return {
    id: serialized.id,
    tenantId: serialized.tenantId,
    organizationId: serialized.organizationId,
    projectId: serialized.projectId,
    knowledgeBaseId: serialized.knowledgeBaseId,
    queryText: serialized.queryText,
    queryHash: serialized.queryHash,
    filters: serialized.filters,
    topK: serialized.topK,
    scoreThreshold: serialized.scoreThreshold,
    resultCount: serialized.resultCount,
    latencyMs: serialized.latencyMs,
    qdrantLatencyMs: serialized.qdrantLatencyMs,
    status: serialized.status,
    errorCode: serialized.errorCode,
    errorMessage: serialized.errorMessage,
    metadata: serialized.metadata,
    createdAt: serialized.createdAt,
    updatedAt: serialized.updatedAt,
    results: results.map(serializeRetrievalResultDebug),
  };
}

/**
 * Serialize a retrieval result debug summary.
 * @param result - Retrieval result record.
 * @returns Safe result summary.
 */
function serializeRetrievalResultDebug(
  result: Record<string, any>
): Record<string, unknown> {
  return {
    id: result.id,
    tenantId: result.tenantId,
    sourceId: result.sourceId,
    fileId: result.fileId,
    chunkId: result.chunkId,
    chunkEmbeddingId: result.chunkEmbeddingId,
    qdrantPointId: result.qdrantPointId,
    rank: result.rank,
    score: result.score,
    textPreview: result.textPreview,
    metadata: result.metadata,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
}

/**
 * Stable stringify an object by sorting keys recursively.
 * @param value - Value to stringify.
 * @returns Stable JSON string.
 */
function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

/**
 * Sort JSON object keys recursively.
 * @param value - Value to sort.
 * @returns Sorted value.
 */
function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortJsonValue(item)])
    );
  }

  return value;
}
