import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import type { RetrievalResponseResult } from "../retrieval.types.js";

/**
 * Persists retrieval result traceability rows.
 */
@Injectable()
export class RetrievalResultService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Store retrieval result rows when persistence is enabled.
   * @param retrievalQueryId - Retrieval query ID.
   * @param tenantId - Tenant ID.
   * @param results - Safe retrieval results.
   * @param storeResults - Whether result persistence is enabled.
   */
  async storeResults(
    retrievalQueryId: string,
    tenantId: string,
    results: RetrievalResponseResult[],
    storeResults: boolean
  ): Promise<void> {
    if (!storeResults || results.length === 0) {
      return;
    }

    await this.prisma.retrievalResult.createMany({
      data: results.map((result) => ({
        retrievalQueryId,
        tenantId,
        sourceId: result.sourceId,
        fileId: result.fileId,
        chunkId: result.chunkId,
        chunkEmbeddingId: result.chunkEmbeddingId,
        qdrantPointId: result.qdrantPointId,
        rank: result.rank,
        score: result.score,
        vectorScore: result.score,
        textPreview: result.textPreview,
        payload: result.persistedPayload,
        metadata: result.metadata,
      })),
    });
  }
}
