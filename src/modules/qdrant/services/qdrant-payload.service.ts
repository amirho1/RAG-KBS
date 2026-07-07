import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type {
  BuildQdrantPayloadInput,
  QdrantPointPayload,
} from "../qdrant.types.js";

/**
 * Builds safe Qdrant payloads for chunk vectors.
 */
@Injectable()
export class QdrantPayloadService {
  /**
   * Build a Qdrant payload that stores full chunk text and filter metadata.
   * @param input - Payload input.
   * @returns Qdrant payload.
   */
  buildPayload(input: BuildQdrantPayloadInput): QdrantPointPayload {
    return {
      tenantId: input.tenantId,
      organizationId: input.organizationId,
      projectId: input.projectId,
      knowledgeBaseId: input.knowledgeBaseId,
      sourceId: input.sourceId,
      fileId: input.fileId,
      parsedDocumentId: input.parsedDocumentId,
      chunkId: input.chunkId,
      chunkEmbeddingId: input.chunkEmbeddingId,
      qdrantCollectionId: input.qdrantCollectionId,
      sourceType: input.sourceType,
      fileType: input.fileType,
      mimeType: input.mimeType,
      language: input.language,
      tags: input.tags,
      title: input.title,
      description: input.description,
      chunkIndex: input.chunkIndex,
      pageStart: input.pageStart,
      pageEnd: input.pageEnd,
      headingPath: input.headingPath,
      text: input.text,
      textPreview: input.textPreview,
      contentHash: input.contentHash,
      embeddedContentHash: input.embeddedContentHash,
      createdAt: input.createdAt.toISOString(),
      updatedAt: input.updatedAt.toISOString(),
    };
  }

  /**
   * Hash a payload for sync checks.
   * @param payload - Payload to hash.
   * @returns SHA-256 payload hash.
   */
  createPayloadHash(payload: QdrantPointPayload): string {
    return createHash("sha256")
      .update(JSON.stringify(payload), "utf8")
      .digest("hex");
  }
}
