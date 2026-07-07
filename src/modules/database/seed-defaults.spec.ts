import {
  DistanceMetric,
  EmbeddingProvider,
  QdrantCollectionStatus,
} from "../../generated/prisma/enums.js";
import {
  buildDefaultChunkingConfigData,
  buildDefaultEmbeddingConfigData,
  buildDefaultEmbeddingModelData,
  buildDefaultQdrantCollectionData,
  resolveDefaultSeedConfig,
  resolveDefaultTenantId,
  resolveDistanceMetric,
  resolveEmbeddingProvider,
} from "./seed-defaults.js";

describe("seed defaults", () => {
  it("should resolve the default tenant ID when unset", () => {
    expect(resolveDefaultTenantId({})).toBe("default");
  });

  it("should resolve a trimmed tenant ID from the environment", () => {
    expect(resolveDefaultTenantId({ DEFAULT_TENANT_ID: " tenant-a " })).toBe(
      "tenant-a"
    );
  });

  it("should map known embedding providers and fallback to CUSTOM", () => {
    expect(resolveEmbeddingProvider("openai")).toBe(EmbeddingProvider.OPENAI);
    expect(resolveEmbeddingProvider("azure-openai")).toBe(
      EmbeddingProvider.AZURE_OPENAI
    );
    expect(resolveEmbeddingProvider("unknown-provider")).toBe(
      EmbeddingProvider.CUSTOM
    );
  });

  it("should resolve supported distance metrics", () => {
    expect(resolveDistanceMetric("Cosine")).toBe(DistanceMetric.COSINE);
    expect(resolveDistanceMetric("dot")).toBe(DistanceMetric.DOT);
    expect(resolveDistanceMetric("unknown")).toBe(DistanceMetric.COSINE);
  });

  it("should resolve the default seed config from environment variables", () => {
    const seedConfig = resolveDefaultSeedConfig({
      DEFAULT_TENANT_ID: "tenant-a",
      EMBEDDING_PROVIDER: "openai",
      EMBEDDING_MODEL: "text-embedding-3-large",
      EMBEDDING_DIMENSION: "3072",
      EMBEDDING_DISTANCE_METRIC: "Dot",
      QDRANT_COLLECTION_NAME: "tenant_a_vectors",
      QDRANT_VECTOR_SIZE: "3072",
      QDRANT_DISTANCE_METRIC: "Dot",
    });

    expect(seedConfig).toEqual({
      tenantId: "tenant-a",
      embeddingProvider: EmbeddingProvider.OPENAI,
      embeddingModel: "text-embedding-3-large",
      embeddingDimension: 3072,
      embeddingDistanceMetric: DistanceMetric.DOT,
      qdrantCollection: "tenant_a_vectors",
      qdrantVectorSize: 3072,
      qdrantDistanceMetric: DistanceMetric.DOT,
    });
  });

  it("should build default chunking config data", () => {
    const chunkingConfigData = buildDefaultChunkingConfigData("tenant-a");

    expect(chunkingConfigData).toMatchObject({
      tenantId: "tenant-a",
      name: "Default Recursive Text Chunking",
      strategy: "RECURSIVE_TEXT",
      chunkSize: 800,
      chunkOverlap: 120,
      tokenizer: "APPROXIMATE",
      isDefault: true,
      isActive: true,
    });
  });

  it("should build default embedding and Qdrant records", () => {
    const seedConfig = resolveDefaultSeedConfig({
      DEFAULT_TENANT_ID: "tenant-a",
      EMBEDDING_PROVIDER: "openai",
      EMBEDDING_MODEL: "text-embedding-3-small",
      EMBEDDING_DIMENSION: "1536",
      QDRANT_COLLECTION_NAME: "rag_kbs_test",
    });

    const embeddingModelData = buildDefaultEmbeddingModelData(seedConfig);
    const embeddingConfigData = buildDefaultEmbeddingConfigData(
      seedConfig,
      "embedding-model-id",
      "chunking-config-id"
    );
    const qdrantCollectionData = buildDefaultQdrantCollectionData(
      seedConfig,
      "embedding-model-id",
      "embedding-config-id"
    );

    expect(embeddingModelData).toMatchObject({
      provider: EmbeddingProvider.OPENAI,
      modelName: "text-embedding-3-small",
      dimension: 1536,
      distanceMetric: DistanceMetric.COSINE,
      isDefault: true,
      isActive: true,
    });
    expect(embeddingConfigData).toMatchObject({
      tenantId: "tenant-a",
      name: "Default Embedding Config",
      embeddingModelId: "embedding-model-id",
      chunkingConfigId: "chunking-config-id",
      isDefault: true,
      isActive: true,
    });
    expect(qdrantCollectionData).toMatchObject({
      tenantId: "tenant-a",
      embeddingModelId: "embedding-model-id",
      embeddingConfigId: "embedding-config-id",
      name: "rag_kbs_test",
      alias: "rag_kbs_test",
      vectorSize: 1536,
      distanceMetric: DistanceMetric.COSINE,
      status: QdrantCollectionStatus.ACTIVE,
      isDefaultRead: true,
      isDefaultWrite: true,
    });
  });
});
