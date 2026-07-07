import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import retrievalConfig from "../../../config/retrieval.config.js";
import { PinoLoggerService } from "../../../common/logger/pino-logger.service.js";
import { RequestContextService } from "../../../common/request-context/request-context.service.js";
import { EmbeddingConfigService } from "../../embeddings/services/embedding-config.service.js";
import { EmbeddingsService } from "../../embeddings/services/embeddings.service.js";
import { QdrantCollectionService } from "../../qdrant/services/qdrant-collection.service.js";
import { QdrantService } from "../../qdrant/services/qdrant.service.js";
import {
  retrievalEmbeddingCompletedEvent,
  retrievalEmbeddingStartedEvent,
  retrievalQdrantSearchCompletedEvent,
  retrievalQdrantSearchStartedEvent,
  retrievalQueryCompletedEvent,
  retrievalQueryFailedEvent,
  retrievalQueryReceivedEvent,
  retrievalResultsMappedEvent,
  retrievalSafeErrorMessages,
} from "../retrieval.constants.js";
import type {
  NormalizedRetrievalFilters,
  RetrievalApiResult,
  RetrievalQueryOptions,
  RetrievalResponse,
  RetrievalResponseResult,
  RetrievalScopeValidation,
} from "../retrieval.types.js";
import { RetrievalException } from "../retrieval.types.js";
import type { RetrievalQueryInput } from "../dto/retrieval-query.dto.js";
import { RetrievalFilterService } from "./retrieval-filter.service.js";
import { RetrievalQueryService } from "./retrieval-query.service.js";
import { RetrievalResponseMapperService } from "./retrieval-response-mapper.service.js";
import { RetrievalResultService } from "./retrieval-result.service.js";

type RetrievalExecutionRecord = {
  id: string;
  createdAt: Date;
};

type RetrievalRuntime = {
  data: RetrievalQueryInput;
  normalizedQuery: string;
  filters: NormalizedRetrievalFilters;
  safeFilters: Record<string, unknown>;
  scope: RetrievalScopeValidation;
  options: RetrievalQueryOptions;
  requestId?: string;
  startedAt: number;
};

/**
 * Orchestrates query embedding, Qdrant search, result mapping, and traceability.
 */
@Injectable()
export class RetrievalService {
  constructor(
    private readonly retrievalQueryService: RetrievalQueryService,
    private readonly retrievalResultService: RetrievalResultService,
    private readonly retrievalFilterService: RetrievalFilterService,
    private readonly retrievalResponseMapperService: RetrievalResponseMapperService,
    private readonly embeddingConfigService: EmbeddingConfigService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly qdrantCollectionService: QdrantCollectionService,
    private readonly qdrantService: QdrantService,
    private readonly logger: PinoLoggerService,
    private readonly requestContextService: RequestContextService,
    @Inject(retrievalConfig.KEY)
    private readonly retrieval: ConfigType<typeof retrievalConfig>
  ) {}

  /**
   * Execute a retrieval query and return context chunks only.
   * @param data - Retrieval query input.
   * @returns Retrieval response.
   */
  async query(data: RetrievalQueryInput): Promise<RetrievalResponse> {
    const runtime = await this.prepareRuntime(data);
    let queryRecord: RetrievalExecutionRecord | undefined;

    try {
      const queryHash = this.retrievalQueryService.createQueryHash({
        tenantId: data.tenantId,
        knowledgeBaseId: data.knowledgeBaseId,
        query: runtime.normalizedQuery,
        filters: runtime.safeFilters,
      });

      queryRecord = await this.retrievalQueryService.createPendingQuery({
        data,
        normalizedQuery: runtime.normalizedQuery,
        queryHash,
        filters: runtime.safeFilters,
        options: runtime.options,
        requestId: runtime.requestId,
        storeQueryText: this.retrieval.storeQueryText,
      });

      return await this.executeRuntime(runtime, queryRecord);
    } catch (error) {
      const retrievalError = toRetrievalException(error);
      const latencyMs = calculateLatencyMs(runtime.startedAt);

      if (queryRecord) {
        await this.markQueryFailed(queryRecord.id, retrievalError, latencyMs);
      }

      this.logFailed(runtime, queryRecord?.id, retrievalError, latencyMs);
      throw retrievalError;
    }
  }

  /**
   * Get one tenant-scoped retrieval query debug record.
   * @param id - Retrieval query ID.
   * @param tenantId - Tenant ID.
   * @returns Safe debug record.
   */
  getById(id: string, tenantId: string): Promise<Record<string, unknown>> {
    return this.retrievalQueryService.getById(id, tenantId);
  }

  /**
   * Prepare normalized input, filters, and scope validation.
   * @param data - Retrieval query input.
   * @returns Runtime data.
   */
  private async prepareRuntime(
    data: RetrievalQueryInput
  ): Promise<RetrievalRuntime> {
    const startedAt = Date.now();
    const normalizedQuery = normalizeQueryText(data.query);

    if (normalizedQuery.length === 0) {
      throw new RetrievalException(
        "EMPTY_QUERY",
        retrievalSafeErrorMessages.EMPTY_QUERY,
        HttpStatus.BAD_REQUEST
      );
    }

    const options = resolveRetrievalOptions(data, this.retrieval);
    const filters = this.retrievalFilterService.normalizeFilters(data.filters);
    const safeFilters = this.retrievalFilterService.buildSafeFilters(filters);
    const requestId = this.requestContextService.getRequestId();

    this.logReceived(data, filters, options, requestId);

    const scope = await this.retrievalQueryService.validateScope(
      data.tenantId,
      data.knowledgeBaseId,
      filters
    );

    return {
      data,
      normalizedQuery,
      filters,
      safeFilters,
      scope,
      options,
      requestId,
      startedAt,
    };
  }

  /**
   * Execute embedding, Qdrant search, mapping, and persistence.
   * @param runtime - Runtime input.
   * @param queryRecord - Created query record.
   * @returns Retrieval response.
   */
  private async executeRuntime(
    runtime: RetrievalRuntime,
    queryRecord: RetrievalExecutionRecord
  ): Promise<RetrievalResponse> {
    const embeddingConfig = await this.loadEmbeddingConfig(
      runtime.data.tenantId
    );
    const qdrantCollection = await this.loadQdrantReadCollection(
      runtime.data.tenantId
    );

    validateEmbeddingCompatibility(embeddingConfig, qdrantCollection);

    await this.retrievalQueryService.attachExecutionTargets(queryRecord.id, {
      embeddingConfigId: embeddingConfig.id,
      embeddingModelId: embeddingConfig.embeddingModelId,
      qdrantCollectionId: qdrantCollection.id,
    });

    const queryVector = await this.embedQuery(runtime, queryRecord.id, {
      embeddingConfigId: embeddingConfig.id,
      embeddingModelId: embeddingConfig.embeddingModelId,
      dimension: embeddingConfig.embeddingModel.dimension,
      provider: embeddingConfig.embeddingModel.provider,
      qdrantCollectionId: qdrantCollection.id,
    });
    const payloadFilter = this.retrievalFilterService.buildPayloadFilter({
      tenantId: runtime.data.tenantId,
      knowledgeBaseId: runtime.data.knowledgeBaseId,
      filters: runtime.filters,
      tagFilterValues: runtime.scope.tagFilterValues,
    });
    const searchStartedAt = Date.now();
    const qdrantResults = await this.searchQdrant(runtime, queryRecord.id, {
      collectionName: qdrantCollection.name,
      qdrantCollectionId: qdrantCollection.id,
      queryVector,
      payloadFilter,
    });
    const qdrantLatencyMs = calculateLatencyMs(searchStartedAt);
    const mappedResults = this.retrievalResponseMapperService.mapSearchResults({
      results: qdrantResults,
      includeText: runtime.options.includeText,
      includeMetadata: runtime.options.includeMetadata,
    });

    this.logger.info({
      ...buildSafeLogPayload(runtime, queryRecord.id),
      event: retrievalResultsMappedEvent,
      resultCount: mappedResults.length,
    });

    await this.retrievalResultService.storeResults(
      queryRecord.id,
      runtime.data.tenantId,
      mappedResults,
      this.retrieval.storeResults
    );

    const latencyMs = calculateLatencyMs(runtime.startedAt);
    await this.retrievalQueryService.markCompleted({
      queryId: queryRecord.id,
      resultCount: mappedResults.length,
      latencyMs,
      qdrantLatencyMs,
    });

    this.logger.info({
      ...buildSafeLogPayload(runtime, queryRecord.id),
      event: retrievalQueryCompletedEvent,
      resultCount: mappedResults.length,
      latencyMs,
      status: "SUCCESS",
      embeddingConfigId: embeddingConfig.id,
      qdrantCollectionId: qdrantCollection.id,
    });

    return {
      queryId: queryRecord.id,
      tenantId: runtime.data.tenantId,
      knowledgeBaseId: runtime.data.knowledgeBaseId,
      query: runtime.normalizedQuery,
      topK: runtime.options.topK,
      resultCount: mappedResults.length,
      results: mappedResults.map(removePersistenceFields),
      latencyMs,
      createdAt: queryRecord.createdAt.toISOString(),
    };
  }

  /**
   * Load default embedding config and map failures to safe retrieval errors.
   * @param tenantId - Tenant ID.
   * @returns Default embedding config.
   */
  private async loadEmbeddingConfig(tenantId: string) {
    try {
      const embeddingConfig =
        await this.embeddingConfigService.getDefaultConfig(tenantId);

      if (!embeddingConfig.embeddingModel?.isActive) {
        throw new RetrievalException(
          "EMBEDDING_MODEL_NOT_FOUND",
          retrievalSafeErrorMessages.EMBEDDING_MODEL_NOT_FOUND,
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      return embeddingConfig;
    } catch (error) {
      if (error instanceof RetrievalException) {
        throw error;
      }

      throw new RetrievalException(
        "EMBEDDING_CONFIG_NOT_FOUND",
        retrievalSafeErrorMessages.EMBEDDING_CONFIG_NOT_FOUND,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Load the default Qdrant read collection.
   * @param tenantId - Tenant ID.
   * @returns Default read collection.
   */
  private async loadQdrantReadCollection(tenantId: string) {
    try {
      return await this.qdrantCollectionService.getDefaultReadCollection(
        tenantId
      );
    } catch {
      throw new RetrievalException(
        "QDRANT_COLLECTION_NOT_FOUND",
        retrievalSafeErrorMessages.QDRANT_COLLECTION_NOT_FOUND,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Embed the normalized user query.
   * @param runtime - Runtime input.
   * @param queryId - Retrieval query ID.
   * @param input - Embedding input metadata.
   * @returns Query vector.
   */
  private async embedQuery(
    runtime: RetrievalRuntime,
    queryId: string,
    input: {
      embeddingConfigId: string;
      embeddingModelId: string;
      dimension: number;
      provider: Parameters<EmbeddingsService["embedBatch"]>[2];
      qdrantCollectionId: string;
    }
  ): Promise<number[]> {
    this.logger.info({
      ...buildSafeLogPayload(runtime, queryId),
      event: retrievalEmbeddingStartedEvent,
      embeddingConfigId: input.embeddingConfigId,
      embeddingModelId: input.embeddingModelId,
      qdrantCollectionId: input.qdrantCollectionId,
    });

    try {
      const result = await runWithTimeout(
        this.embeddingsService.embedBatch(
          [runtime.normalizedQuery],
          input.dimension,
          input.provider
        ),
        this.retrieval.timeoutMs
      );
      const embedding = result.embeddings[0];

      if (!embedding) {
        throw new Error("QUERY_EMBEDDING_MISSING");
      }

      this.logger.info({
        ...buildSafeLogPayload(runtime, queryId),
        event: retrievalEmbeddingCompletedEvent,
        embeddingConfigId: input.embeddingConfigId,
        embeddingModelId: input.embeddingModelId,
        qdrantCollectionId: input.qdrantCollectionId,
      });

      return embedding.vector;
    } catch (error) {
      throw mapEmbeddingError(error);
    }
  }

  /**
   * Search Qdrant with vector and payload filters.
   * @param runtime - Runtime input.
   * @param queryId - Retrieval query ID.
   * @param input - Search input.
   * @returns Qdrant search results.
   */
  private async searchQdrant(
    runtime: RetrievalRuntime,
    queryId: string,
    input: {
      collectionName: string;
      qdrantCollectionId: string;
      queryVector: number[];
      payloadFilter: Record<string, unknown>;
    }
  ) {
    this.logger.info({
      ...buildSafeLogPayload(runtime, queryId),
      event: retrievalQdrantSearchStartedEvent,
      qdrantCollectionId: input.qdrantCollectionId,
    });

    try {
      const results = await runWithTimeout(
        this.qdrantService.searchPoints({
          collectionName: input.collectionName,
          vector: input.queryVector,
          topK: runtime.options.topK,
          scoreThreshold: runtime.options.scoreThreshold,
          filter: input.payloadFilter,
          timeoutMs: this.retrieval.timeoutMs,
        }),
        this.retrieval.timeoutMs
      );

      this.logger.info({
        ...buildSafeLogPayload(runtime, queryId),
        event: retrievalQdrantSearchCompletedEvent,
        qdrantCollectionId: input.qdrantCollectionId,
        resultCount: results.length,
      });

      return results;
    } catch (error) {
      if (error instanceof RetrievalException) {
        throw error;
      }

      if (error instanceof Error && error.message === "RETRIEVAL_TIMEOUT") {
        throw new RetrievalException(
          "RETRIEVAL_TIMEOUT",
          retrievalSafeErrorMessages.RETRIEVAL_TIMEOUT,
          HttpStatus.GATEWAY_TIMEOUT
        );
      }

      throw new RetrievalException(
        "QDRANT_SEARCH_FAILED",
        retrievalSafeErrorMessages.QDRANT_SEARCH_FAILED,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Safely mark a query as failed without masking the original error.
   * @param queryId - Retrieval query ID.
   * @param error - Retrieval error.
   * @param latencyMs - Request latency.
   */
  private async markQueryFailed(
    queryId: string,
    error: RetrievalException,
    latencyMs: number
  ): Promise<void> {
    try {
      await this.retrievalQueryService.markFailed({
        queryId,
        errorCode: error.errorCode,
        errorMessage: getRetrievalExceptionMessage(error),
        latencyMs,
      });
    } catch {
      return;
    }
  }

  /**
   * Log a safe retrieval query received event.
   * @param data - Request input.
   * @param filters - Normalized filters.
   * @param options - Resolved options.
   * @param requestId - Request ID.
   */
  private logReceived(
    data: RetrievalQueryInput,
    filters: NormalizedRetrievalFilters,
    options: RetrievalQueryOptions,
    requestId: string | undefined
  ): void {
    this.logger.info({
      event: retrievalQueryReceivedEvent,
      requestId,
      tenantId: data.tenantId,
      knowledgeBaseId: data.knowledgeBaseId,
      sourceIds: filters.sourceIds,
      fileIds: filters.fileIds,
      tagCount: filters.tags.length,
      topK: options.topK,
      scoreThreshold: options.scoreThreshold,
    });
  }

  /**
   * Log a safe retrieval failure event.
   * @param runtime - Runtime input.
   * @param queryId - Retrieval query ID.
   * @param error - Retrieval error.
   * @param latencyMs - Request latency.
   */
  private logFailed(
    runtime: RetrievalRuntime,
    queryId: string | undefined,
    error: RetrievalException,
    latencyMs: number
  ): void {
    this.logger.errorPayload({
      ...buildSafeLogPayload(runtime, queryId),
      event: retrievalQueryFailedEvent,
      latencyMs,
      status: "FAILED",
      errorCode: error.errorCode,
    });
  }
}

/**
 * Resolve request options with retrieval config defaults.
 * @param data - Retrieval query input.
 * @param config - Retrieval config.
 * @returns Resolved options.
 */
function resolveRetrievalOptions(
  data: RetrievalQueryInput,
  config: ConfigType<typeof retrievalConfig>
): RetrievalQueryOptions {
  const topK = data.topK ?? config.defaultTopK;

  if (topK > config.maxTopK) {
    throw new RetrievalException(
      "INVALID_RETRIEVAL_FILTER",
      `topK must be less than or equal to ${config.maxTopK}.`,
      HttpStatus.BAD_REQUEST
    );
  }

  return {
    topK,
    scoreThreshold: data.scoreThreshold ?? config.defaultScoreThreshold,
    includeText: data.includeText ?? config.includeTextDefault,
    includeMetadata: data.includeMetadata ?? config.includeMetadataDefault,
  };
}

/**
 * Validate embedding and collection compatibility.
 * @param embeddingConfig - Embedding config with model.
 * @param qdrantCollection - Qdrant collection metadata.
 */
function validateEmbeddingCompatibility(
  embeddingConfig: Awaited<
    ReturnType<EmbeddingConfigService["getDefaultConfig"]>
  >,
  qdrantCollection: Awaited<
    ReturnType<QdrantCollectionService["getDefaultReadCollection"]>
  >
): void {
  if (
    qdrantCollection.embeddingModelId !== embeddingConfig.embeddingModelId ||
    qdrantCollection.vectorSize !== embeddingConfig.embeddingModel.dimension
  ) {
    throw new RetrievalException(
      "EMBEDDING_DIMENSION_MISMATCH",
      retrievalSafeErrorMessages.EMBEDDING_DIMENSION_MISMATCH,
      HttpStatus.SERVICE_UNAVAILABLE
    );
  }
}

/**
 * Map embedding failures to safe retrieval errors.
 * @param error - Embedding error.
 * @returns Retrieval exception.
 */
function mapEmbeddingError(error: unknown): RetrievalException {
  if (error instanceof RetrievalException) {
    return error;
  }

  if (
    error instanceof Error &&
    error.message === "EMBEDDING_DIMENSION_MISMATCH"
  ) {
    return new RetrievalException(
      "EMBEDDING_DIMENSION_MISMATCH",
      retrievalSafeErrorMessages.EMBEDDING_DIMENSION_MISMATCH,
      HttpStatus.SERVICE_UNAVAILABLE
    );
  }

  if (error instanceof Error && error.message === "RETRIEVAL_TIMEOUT") {
    return new RetrievalException(
      "RETRIEVAL_TIMEOUT",
      retrievalSafeErrorMessages.RETRIEVAL_TIMEOUT,
      HttpStatus.GATEWAY_TIMEOUT
    );
  }

  return new RetrievalException(
    "QUERY_EMBEDDING_FAILED",
    retrievalSafeErrorMessages.QUERY_EMBEDDING_FAILED,
    HttpStatus.SERVICE_UNAVAILABLE
  );
}

/**
 * Convert unknown errors to retrieval exceptions.
 * @param error - Unknown error.
 * @returns Retrieval exception.
 */
function toRetrievalException(error: unknown): RetrievalException {
  if (error instanceof RetrievalException) {
    return error;
  }

  if (error instanceof Error && error.message === "RETRIEVAL_TIMEOUT") {
    return new RetrievalException(
      "RETRIEVAL_TIMEOUT",
      retrievalSafeErrorMessages.RETRIEVAL_TIMEOUT,
      HttpStatus.GATEWAY_TIMEOUT
    );
  }

  return new RetrievalException(
    "RETRIEVAL_FAILED",
    retrievalSafeErrorMessages.RETRIEVAL_FAILED,
    HttpStatus.INTERNAL_SERVER_ERROR
  );
}

/**
 * Run a promise with a timeout.
 * @param promise - Promise to run.
 * @param timeoutMs - Timeout in milliseconds.
 * @returns Promise result.
 */
function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("RETRIEVAL_TIMEOUT"));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        clearTimeout(timeout);
      });
  });
}

/**
 * Normalize query text for embedding and hashing.
 * @param query - Raw query text.
 * @returns Normalized query text.
 */
function normalizeQueryText(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}

/**
 * Calculate latency since a start time.
 * @param startedAt - Start timestamp in milliseconds.
 * @returns Latency in milliseconds.
 */
function calculateLatencyMs(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

/**
 * Build safe common log fields.
 * @param runtime - Runtime input.
 * @param retrievalQueryId - Retrieval query ID.
 * @returns Safe log payload.
 */
function buildSafeLogPayload(
  runtime: RetrievalRuntime,
  retrievalQueryId: string | undefined
): Record<string, unknown> {
  return {
    requestId: runtime.requestId,
    retrievalQueryId,
    tenantId: runtime.data.tenantId,
    knowledgeBaseId: runtime.data.knowledgeBaseId,
    sourceIds: runtime.filters.sourceIds,
    fileIds: runtime.filters.fileIds,
    tagCount: runtime.filters.tags.length,
    topK: runtime.options.topK,
    scoreThreshold: runtime.options.scoreThreshold,
  };
}

/**
 * Remove persistence-only fields from API results.
 * @param result - Internal mapped result.
 * @returns API result.
 */
function removePersistenceFields(
  result: RetrievalResponseResult
): RetrievalApiResult {
  return {
    rank: result.rank,
    score: result.score,
    chunkId: result.chunkId,
    sourceId: result.sourceId,
    fileId: result.fileId,
    ...(result.text ? { text: result.text } : {}),
    textPreview: result.textPreview,
    ...(result.metadata ? { metadata: result.metadata } : {}),
  };
}

/**
 * Read a safe message from a retrieval exception.
 * @param error - Retrieval exception.
 * @returns Safe exception message.
 */
function getRetrievalExceptionMessage(error: RetrievalException): string {
  const response = error.getResponse();

  if (
    typeof response === "object" &&
    response !== null &&
    "message" in response &&
    typeof response.message === "string"
  ) {
    return response.message;
  }

  return retrievalSafeErrorMessages[error.errorCode];
}
