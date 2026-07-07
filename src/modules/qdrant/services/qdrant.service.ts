import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import qdrantConfig from "../../../config/qdrant.config.js";
import { qdrantDistanceMetricByPrismaMetric } from "../qdrant.constants.js";
import type {
  EnsureQdrantCollectionInput,
  QdrantUpsertPoint,
} from "../qdrant.types.js";
import { QdrantClientService } from "./qdrant-client.service.js";

/**
 * Project-level Qdrant operations backed by the official SDK.
 */
@Injectable()
export class QdrantService {
  constructor(
    private readonly qdrantClientService: QdrantClientService,
    @Inject(qdrantConfig.KEY)
    private readonly qdrant: ConfigType<typeof qdrantConfig>
  ) {}

  /**
   * Check Qdrant health through the SDK.
   */
  async healthCheck(): Promise<void> {
    await this.qdrantClientService.getClient().versionInfo();
  }

  /**
   * Ensure a collection exists with the expected vector settings.
   * @param input - Expected collection config.
   */
  async ensureCollectionExists(
    input: EnsureQdrantCollectionInput
  ): Promise<void> {
    const client = this.qdrantClientService.getClient();
    const exists = await client.collectionExists(input.qdrantName);

    if (!exists.exists) {
      await client.createCollection(input.qdrantName, {
        vectors: {
          size: input.vectorSize,
          distance: qdrantDistanceMetricByPrismaMetric[input.distanceMetric],
        },
        timeout: toSeconds(this.qdrant.timeoutMs),
      });
      return;
    }

    const collection = await client.getCollection(input.qdrantName);
    validateCollectionVectorConfig(collection, input);
  }

  /**
   * Get collection information.
   * @param collectionName - Qdrant collection name.
   * @returns Collection info.
   */
  getCollectionInfo(collectionName: string) {
    return this.qdrantClientService.getClient().getCollection(collectionName);
  }

  /**
   * Upsert vectors into Qdrant.
   * @param collectionName - Qdrant collection name.
   * @param points - Points to upsert.
   */
  async upsertPoints(
    collectionName: string,
    points: QdrantUpsertPoint[]
  ): Promise<void> {
    for (const batch of chunkArray(points, this.qdrant.upsertBatchSize)) {
      await this.qdrantClientService.getClient().upsert(collectionName, {
        wait: true,
        timeout: toSeconds(this.qdrant.timeoutMs),
        points: batch.map((point) => ({
          id: point.id,
          vector: point.vector,
          payload: point.payload,
        })),
      });
    }
  }

  /**
   * Delete points by IDs.
   * @param collectionName - Qdrant collection name.
   * @param pointIds - Qdrant point IDs.
   */
  async deletePoints(
    collectionName: string,
    pointIds: string[]
  ): Promise<void> {
    await this.qdrantClientService.getClient().delete(collectionName, {
      wait: true,
      timeout: toSeconds(this.qdrant.timeoutMs),
      points: pointIds,
    });
  }

  /**
   * Delete points by payload filter.
   * @param collectionName - Qdrant collection name.
   * @param filter - Qdrant payload filter.
   */
  async deleteByPayloadFilter(
    collectionName: string,
    filter: Record<string, unknown>
  ): Promise<void> {
    await this.qdrantClientService.getClient().delete(collectionName, {
      wait: true,
      timeout: toSeconds(this.qdrant.timeoutMs),
      filter,
    });
  }
}

/**
 * Convert milliseconds to SDK timeout seconds.
 * @param timeoutMs - Timeout in milliseconds.
 * @returns Timeout in seconds.
 */
function toSeconds(timeoutMs: number): number {
  return Math.max(1, Math.ceil(timeoutMs / 1_000));
}

/**
 * Split an array into fixed-size batches.
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
 * Validate existing collection vector settings.
 * @param collection - Collection info.
 * @param expected - Expected collection settings.
 */
function validateCollectionVectorConfig(
  collection: unknown,
  expected: EnsureQdrantCollectionInput
): void {
  const vectorConfig = extractVectorConfig(collection);

  if (!vectorConfig) {
    return;
  }

  if (
    vectorConfig.size !== expected.vectorSize ||
    vectorConfig.distance !==
      qdrantDistanceMetricByPrismaMetric[expected.distanceMetric]
  ) {
    throw new Error("QDRANT_COLLECTION_CONFIG_MISMATCH");
  }
}

/**
 * Extract anonymous vector settings from Qdrant collection info.
 * @param collection - Collection info.
 * @returns Vector settings when available.
 */
function extractVectorConfig(
  collection: unknown
): { size?: number; distance?: string } | null {
  const value = collection as {
    config?: {
      params?: {
        vectors?: unknown;
      };
    };
  };
  const vectors = value.config?.params?.vectors;

  if (!vectors || Array.isArray(vectors) || typeof vectors !== "object") {
    return null;
  }

  if ("size" in vectors || "distance" in vectors) {
    return vectors as { size?: number; distance?: string };
  }

  return null;
}
