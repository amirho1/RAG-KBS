import { HttpException, HttpStatus } from "@nestjs/common";
import type { MetadataJson } from "../../common/dto/metadata.dto.js";
import type { QdrantSearchResult } from "../qdrant/qdrant.types.js";
import type { retrievalErrorCodes } from "./retrieval.constants.js";

export type RetrievalErrorCode = (typeof retrievalErrorCodes)[number];

export type RetrievalFilterInput = {
  sourceId?: string;
  sourceIds?: string[];
  fileId?: string;
  fileIds?: string[];
  tags?: string[];
  mimeType?: string;
  mimeTypes?: string[];
  language?: string;
};

export type NormalizedRetrievalFilters = {
  sourceIds: string[];
  fileIds: string[];
  tags: string[];
  mimeTypes: string[];
  language?: string;
};

export type RetrievalQueryOptions = {
  topK: number;
  scoreThreshold: number;
  includeText: boolean;
  includeMetadata: boolean;
};

export type RetrievalScopeValidation = {
  tagFilterValues: string[];
};

export type RetrievalResponseResult = {
  rank: number;
  score?: number;
  chunkId: string;
  sourceId: string;
  fileId: string;
  text?: string;
  textPreview: string;
  metadata?: Record<string, MetadataJson>;
  chunkEmbeddingId?: string;
  qdrantPointId?: string;
  persistedPayload: Record<string, MetadataJson>;
};

export type RetrievalApiResult = Omit<
  RetrievalResponseResult,
  "chunkEmbeddingId" | "qdrantPointId" | "persistedPayload"
>;

export type RetrievalResponse = {
  queryId: string;
  tenantId: string;
  knowledgeBaseId: string;
  query: string;
  topK: number;
  resultCount: number;
  results: RetrievalApiResult[];
  latencyMs: number;
  createdAt: string;
};

export type RetrievalExecutionContext = {
  retrievalQueryId: string;
  createdAt: Date;
};

export type MapRetrievalResultsInput = {
  results: QdrantSearchResult[];
  includeText: boolean;
  includeMetadata: boolean;
};

export type BuildRetrievalFilterInput = {
  tenantId: string;
  knowledgeBaseId: string;
  filters: NormalizedRetrievalFilters;
  tagFilterValues: string[];
};

/**
 * Safe retrieval exception with a stable public error code.
 */
export class RetrievalException extends HttpException {
  readonly errorCode: RetrievalErrorCode;

  /**
   * Create a retrieval exception.
   * @param errorCode - Safe retrieval error code.
   * @param message - Safe public error message.
   * @param status - HTTP status code.
   */
  constructor(
    errorCode: RetrievalErrorCode,
    message: string,
    status = HttpStatus.BAD_REQUEST
  ) {
    super({ message, errorCode }, status);
    this.errorCode = errorCode;
  }
}
