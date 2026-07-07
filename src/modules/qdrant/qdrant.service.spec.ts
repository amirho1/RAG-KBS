import { describe, expect, it, jest } from "@jest/globals";
import { DistanceMetric } from "../../generated/prisma/enums.js";
import { QdrantClientService } from "./services/qdrant-client.service.js";
import { QdrantService } from "./services/qdrant.service.js";

const qdrantConfig = {
  url: "http://localhost:6333",
  apiKey: "",
  collection: "rag_kbs_test",
  vectorSize: 4,
  distanceMetric: "Cosine",
  upsertBatchSize: 2,
  timeoutMs: 30_000,
} as const;

/**
 * Create a Qdrant service with a mocked SDK client.
 * @param client - Mocked client.
 * @returns Qdrant service.
 */
function createQdrantService(client: Record<string, unknown>): QdrantService {
  return new QdrantService(
    {
      getClient: () => client,
    } as unknown as QdrantClientService,
    qdrantConfig
  );
}

describe("QdrantService", () => {
  it("should create a missing collection", async () => {
    const createCollection = jest.fn<(...args: any[]) => Promise<boolean>>(() =>
      Promise.resolve(true)
    );
    const client = {
      collectionExists: jest.fn(() => Promise.resolve({ exists: false })),
      createCollection,
    };
    const service = createQdrantService(client);

    await service.ensureCollectionExists({
      qdrantName: "rag_kbs_test",
      vectorSize: 4,
      distanceMetric: DistanceMetric.COSINE,
    });

    expect(client.createCollection).toHaveBeenCalledWith(
      "rag_kbs_test",
      expect.objectContaining({
        vectors: {
          size: 4,
          distance: "Cosine",
        },
      })
    );
  });

  it("should upsert points in batches", async () => {
    const upsert = jest.fn<(...args: any[]) => Promise<{ status: string }>>(
      () => Promise.resolve({ status: "completed" })
    );
    const client = {
      upsert,
    };
    const service = createQdrantService(client);

    await service.upsertPoints("rag_kbs_test", [
      { id: "1", vector: [1, 0, 0, 0], payload: { chunkId: "1" } },
      { id: "2", vector: [0, 1, 0, 0], payload: { chunkId: "2" } },
      { id: "3", vector: [0, 0, 1, 0], payload: { chunkId: "3" } },
    ]);

    expect(client.upsert).toHaveBeenCalledTimes(2);
  });

  it("should fail on mismatched existing collection config", async () => {
    const client = {
      collectionExists: jest.fn(() => Promise.resolve({ exists: true })),
      getCollection: jest.fn(() =>
        Promise.resolve({
          config: {
            params: {
              vectors: {
                size: 8,
                distance: "Cosine",
              },
            },
          },
        })
      ),
    };
    const service = createQdrantService(client);

    await expect(
      service.ensureCollectionExists({
        qdrantName: "rag_kbs_test",
        vectorSize: 4,
        distanceMetric: DistanceMetric.COSINE,
      })
    ).rejects.toThrow("QDRANT_COLLECTION_CONFIG_MISMATCH");
  });

  it("should search points with payloads and without vectors", async () => {
    const search = jest.fn<(...args: any[]) => Promise<any[]>>(() =>
      Promise.resolve([
        {
          id: "point-1",
          score: 0.8,
          payload: {
            chunkId: "chunk-1",
          },
        },
      ])
    );
    const client = {
      search,
    };
    const service = createQdrantService(client);

    const results = await service.searchPoints({
      collectionName: "rag_kbs_test",
      vector: [1, 0, 0, 0],
      topK: 3,
      scoreThreshold: 0.2,
      filter: {
        must: [{ key: "tenantId", match: { value: "tenant_acme" } }],
      },
      timeoutMs: 30_000,
    });

    expect(search).toHaveBeenCalledWith(
      "rag_kbs_test",
      expect.objectContaining({
        with_payload: true,
        with_vector: false,
        limit: 3,
        score_threshold: 0.2,
      })
    );
    expect(results).toEqual([
      {
        id: "point-1",
        score: 0.8,
        payload: {
          chunkId: "chunk-1",
        },
      },
    ]);
  });
});
