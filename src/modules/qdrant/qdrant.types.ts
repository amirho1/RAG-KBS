import type { DistanceMetric } from "../../generated/prisma/enums.js";

export type QdrantPointPayload = Record<string, unknown>;

export type QdrantUpsertPoint = {
  id: string;
  vector: number[];
  payload: QdrantPointPayload;
};

export type EnsureQdrantCollectionInput = {
  qdrantName: string;
  vectorSize: number;
  distanceMetric: DistanceMetric;
};

export type BuildQdrantPayloadInput = {
  tenantId: string;
  organizationId?: string | null;
  projectId?: string | null;
  knowledgeBaseId: string;
  sourceId: string;
  fileId: string;
  parsedDocumentId: string;
  chunkId: string;
  chunkEmbeddingId: string;
  qdrantCollectionId: string;
  sourceType?: string | null;
  fileType?: string | null;
  mimeType?: string | null;
  language?: string | null;
  tags: string[];
  title?: string | null;
  description?: string | null;
  chunkIndex: number;
  pageStart?: number | null;
  pageEnd?: number | null;
  headingPath?: unknown;
  text: string;
  textPreview: string;
  contentHash: string;
  embeddedContentHash: string;
  createdAt: Date;
  updatedAt: Date;
};
