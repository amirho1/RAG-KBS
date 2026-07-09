import {
  DistanceMetric,
  EmbeddingProvider,
  QdrantCollectionStatus,
} from "../../generated/prisma/enums.js";
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";

const defaultTenantId = "default";
const defaultChunkingSize = 800;
const defaultChunkingOverlap = 120;
const defaultChunkingTextPreviewLength = 1_000;
const defaultChunkingMaxChunksPerDocument = 10_000;
const defaultEmbeddingModel = "text-embedding-3-small";
const defaultEmbeddingDimension = 1536;
const defaultQdrantCollection = "rag_kbs_default";
const defaultChunkingConfigName = "Default Recursive Text Chunking";
const defaultEmbeddingConfigName = "Default Embedding Config";
const defaultTokenizer = "APPROXIMATE";

export type DefaultSeedConfig = {
  tenantId: string;
  chunkingDefaultSize: number;
  chunkingDefaultOverlap: number;
  chunkingTextPreviewLength: number;
  chunkingMaxChunksPerDocument: number;
  embeddingProvider: EmbeddingProvider;
  embeddingModel: string;
  embeddingDimension: number;
  embeddingDistanceMetric: DistanceMetric;
  qdrantCollection: string;
  qdrantVectorSize: number;
  qdrantDistanceMetric: DistanceMetric;
};

export type DefaultChunkingConfigData = {
  tenantId: string;
  name: string;
  strategy: string;
  chunkSize: number;
  chunkOverlap: number;
  tokenizer: string;
  preserveHeadings: boolean;
  preserveParagraphs: boolean;
  preserveTables: boolean;
  isDefault: boolean;
  isActive: boolean;
  config: Prisma.InputJsonObject;
};

export type DefaultEmbeddingModelData = {
  provider: EmbeddingProvider;
  modelName: string;
  displayName: string;
  dimension: number;
  distanceMetric: DistanceMetric;
  tokenizer: string;
  isDefault: boolean;
  isActive: boolean;
  metadata: Prisma.InputJsonObject;
};

export type DefaultEmbeddingConfigData = {
  tenantId: string;
  name: string;
  embeddingModelId: string;
  chunkingConfigId: string;
  config: Prisma.InputJsonObject;
  isDefault: boolean;
  isActive: boolean;
};

export type DefaultQdrantCollectionData = {
  tenantId: string;
  embeddingModelId: string;
  embeddingConfigId: string;
  name: string;
  alias: string;
  vectorSize: number;
  distanceMetric: DistanceMetric;
  status: QdrantCollectionStatus;
  isDefaultRead: boolean;
  isDefaultWrite: boolean;
  config: Prisma.InputJsonObject;
};

export type DefaultIndexingRecords = {
  chunkingConfig: Awaited<ReturnType<PrismaClient["chunkingConfig"]["upsert"]>>;
  embeddingModel: Awaited<ReturnType<PrismaClient["embeddingModel"]["upsert"]>>;
  embeddingConfig: Awaited<
    ReturnType<PrismaClient["embeddingConfig"]["upsert"]>
  >;
  qdrantCollection: Awaited<
    ReturnType<PrismaClient["qdrantCollection"]["upsert"]>
  >;
};

/**
 * Resolve the tenant ID used by tenant-scoped seed records.
 * @param env - Environment variable map.
 * @returns The tenant ID for seed records.
 */
export function resolveDefaultTenantId(env: NodeJS.ProcessEnv): string {
  const tenantId = env.DEFAULT_TENANT_ID?.trim();

  return tenantId && tenantId.length > 0 ? tenantId : defaultTenantId;
}

/**
 * Resolve a distance metric enum value from environment text.
 * @param metric - The configured distance metric.
 * @returns The matching distance metric.
 */
export function resolveDistanceMetric(
  metric: string | undefined
): DistanceMetric {
  const normalizedMetric = metric?.trim().toUpperCase();

  if (
    normalizedMetric &&
    Object.values(DistanceMetric).includes(normalizedMetric as DistanceMetric)
  ) {
    return normalizedMetric as DistanceMetric;
  }

  return DistanceMetric.COSINE;
}

/**
 * Resolve an embedding provider enum value from an environment value.
 * @param provider - The configured provider name.
 * @returns The matching embedding provider, or CUSTOM for unknown providers.
 */
export function resolveEmbeddingProvider(
  provider: string | undefined
): EmbeddingProvider {
  const normalizedProvider = provider
    ?.trim()
    .replace(/[-\s]+/g, "_")
    .toUpperCase();

  if (
    normalizedProvider &&
    Object.values(EmbeddingProvider).includes(
      normalizedProvider as EmbeddingProvider
    )
  ) {
    return normalizedProvider as EmbeddingProvider;
  }

  return EmbeddingProvider.CUSTOM;
}

/**
 * Resolve the default database seed configuration.
 * @param env - Environment variable map.
 * @returns The database seed configuration.
 */
export function resolveDefaultSeedConfig(
  env: NodeJS.ProcessEnv
): DefaultSeedConfig {
  return {
    tenantId: resolveDefaultTenantId(env),
    chunkingDefaultSize: resolvePositiveInteger(
      env.CHUNKING_DEFAULT_SIZE,
      defaultChunkingSize
    ),
    chunkingDefaultOverlap: resolveNonNegativeInteger(
      env.CHUNKING_DEFAULT_OVERLAP,
      defaultChunkingOverlap
    ),
    chunkingTextPreviewLength: resolvePositiveInteger(
      env.CHUNKING_TEXT_PREVIEW_LENGTH,
      defaultChunkingTextPreviewLength
    ),
    chunkingMaxChunksPerDocument: resolvePositiveInteger(
      env.CHUNKING_MAX_CHUNKS_PER_DOCUMENT,
      defaultChunkingMaxChunksPerDocument
    ),
    embeddingProvider: resolveEmbeddingProvider(env.EMBEDDING_PROVIDER),
    embeddingModel: resolveTextValue(
      env.EMBEDDING_MODEL,
      defaultEmbeddingModel
    ),
    embeddingDimension: resolvePositiveInteger(
      env.EMBEDDING_DIMENSION,
      defaultEmbeddingDimension
    ),
    embeddingDistanceMetric: resolveDistanceMetric(
      env.EMBEDDING_DISTANCE_METRIC
    ),
    qdrantCollection: resolveTextValue(
      env.QDRANT_COLLECTION_NAME ?? env.QDRANT_COLLECTION,
      defaultQdrantCollection
    ),
    qdrantVectorSize: resolvePositiveInteger(
      env.QDRANT_VECTOR_SIZE ?? env.EMBEDDING_DIMENSION,
      defaultEmbeddingDimension
    ),
    qdrantDistanceMetric: resolveDistanceMetric(env.QDRANT_DISTANCE_METRIC),
  };
}

/**
 * Build the default chunking config seed data.
 * @param seedConfig - The resolved database seed configuration.
 * @returns Default chunking config data.
 */
export function buildDefaultChunkingConfigData(
  seedConfig: DefaultSeedConfig
): DefaultChunkingConfigData {
  return {
    tenantId: seedConfig.tenantId,
    name: defaultChunkingConfigName,
    strategy: "RECURSIVE_TEXT",
    chunkSize: seedConfig.chunkingDefaultSize,
    chunkOverlap: seedConfig.chunkingDefaultOverlap,
    tokenizer: defaultTokenizer,
    preserveHeadings: true,
    preserveParagraphs: true,
    preserveTables: false,
    isDefault: true,
    isActive: true,
    config: {
      seededBy: "prisma",
      textPreviewLength: seedConfig.chunkingTextPreviewLength,
      maxChunksPerDocument: seedConfig.chunkingMaxChunksPerDocument,
    },
  };
}

/**
 * Build the default embedding model seed data.
 * @param seedConfig - The resolved database seed configuration.
 * @returns Default embedding model data.
 */
export function buildDefaultEmbeddingModelData(
  seedConfig: DefaultSeedConfig
): DefaultEmbeddingModelData {
  return {
    provider: seedConfig.embeddingProvider,
    modelName: seedConfig.embeddingModel,
    displayName: seedConfig.embeddingModel,
    dimension: seedConfig.embeddingDimension,
    distanceMetric: seedConfig.embeddingDistanceMetric,
    tokenizer: defaultTokenizer,
    isDefault: true,
    isActive: true,
    metadata: {
      seededBy: "prisma",
    },
  };
}

/**
 * Build the default embedding config seed data.
 * @param seedConfig - The resolved database seed configuration.
 * @param embeddingModelId - Default embedding model ID.
 * @param chunkingConfigId - Default chunking config ID.
 * @returns Default embedding config data.
 */
export function buildDefaultEmbeddingConfigData(
  seedConfig: DefaultSeedConfig,
  embeddingModelId: string,
  chunkingConfigId: string
): DefaultEmbeddingConfigData {
  return {
    tenantId: seedConfig.tenantId,
    name: defaultEmbeddingConfigName,
    embeddingModelId,
    chunkingConfigId,
    config: {
      seededBy: "prisma",
    },
    isDefault: true,
    isActive: true,
  };
}

/**
 * Build the default Qdrant collection seed data.
 * @param seedConfig - The resolved database seed configuration.
 * @param embeddingModelId - Default embedding model ID.
 * @param embeddingConfigId - Default embedding config ID.
 * @returns Default Qdrant collection data.
 */
export function buildDefaultQdrantCollectionData(
  seedConfig: DefaultSeedConfig,
  embeddingModelId: string,
  embeddingConfigId: string
): DefaultQdrantCollectionData {
  return {
    tenantId: seedConfig.tenantId,
    embeddingModelId,
    embeddingConfigId,
    name: seedConfig.qdrantCollection,
    alias: seedConfig.qdrantCollection,
    vectorSize: seedConfig.qdrantVectorSize,
    distanceMetric: seedConfig.qdrantDistanceMetric,
    status: QdrantCollectionStatus.ACTIVE,
    isDefaultRead: true,
    isDefaultWrite: true,
    config: {
      seededBy: "prisma",
    },
  };
}

/**
 * Upsert default tenant indexing records used by seed and runtime provisioning.
 * @param prisma - Prisma client.
 * @param seedConfig - Resolved default indexing configuration.
 * @returns The ensured default indexing records.
 */
export async function upsertDefaultIndexingRecords(
  prisma: PrismaClient,
  seedConfig: DefaultSeedConfig
): Promise<DefaultIndexingRecords> {
  return prisma.$transaction(async (tx) => {
    const chunkingConfigData = buildDefaultChunkingConfigData(seedConfig);
    const chunkingConfig = await tx.chunkingConfig.upsert({
      where: {
        tenantId_name: {
          tenantId: seedConfig.tenantId,
          name: chunkingConfigData.name,
        },
      },
      create: chunkingConfigData,
      update: {
        strategy: chunkingConfigData.strategy,
        chunkSize: chunkingConfigData.chunkSize,
        chunkOverlap: chunkingConfigData.chunkOverlap,
        tokenizer: chunkingConfigData.tokenizer,
        preserveHeadings: chunkingConfigData.preserveHeadings,
        preserveParagraphs: chunkingConfigData.preserveParagraphs,
        preserveTables: chunkingConfigData.preserveTables,
        config: chunkingConfigData.config,
        isDefault: true,
        isActive: true,
        deletedAt: null,
      },
    });

    const embeddingModelData = buildDefaultEmbeddingModelData(seedConfig);
    const embeddingModel = await tx.embeddingModel.upsert({
      where: {
        provider_modelName_dimension: {
          provider: embeddingModelData.provider,
          modelName: embeddingModelData.modelName,
          dimension: embeddingModelData.dimension,
        },
      },
      create: embeddingModelData,
      update: {
        displayName: embeddingModelData.displayName,
        distanceMetric: embeddingModelData.distanceMetric,
        tokenizer: embeddingModelData.tokenizer,
        metadata: embeddingModelData.metadata,
        isDefault: true,
        isActive: true,
      },
    });

    const embeddingConfigData = buildDefaultEmbeddingConfigData(
      seedConfig,
      embeddingModel.id,
      chunkingConfig.id
    );
    const embeddingConfig = await tx.embeddingConfig.upsert({
      where: {
        tenantId_name: {
          tenantId: seedConfig.tenantId,
          name: embeddingConfigData.name,
        },
      },
      create: embeddingConfigData,
      update: {
        embeddingModelId: embeddingConfigData.embeddingModelId,
        chunkingConfigId: embeddingConfigData.chunkingConfigId,
        config: embeddingConfigData.config,
        isDefault: true,
        isActive: true,
      },
    });

    const qdrantCollectionData = buildDefaultQdrantCollectionData(
      seedConfig,
      embeddingModel.id,
      embeddingConfig.id
    );
    const qdrantCollection = await tx.qdrantCollection.upsert({
      where: {
        tenantId_name: {
          tenantId: seedConfig.tenantId,
          name: qdrantCollectionData.name,
        },
      },
      create: qdrantCollectionData,
      update: {
        alias: qdrantCollectionData.alias,
        embeddingModelId: qdrantCollectionData.embeddingModelId,
        embeddingConfigId: qdrantCollectionData.embeddingConfigId,
        vectorSize: qdrantCollectionData.vectorSize,
        distanceMetric: qdrantCollectionData.distanceMetric,
        status: qdrantCollectionData.status,
        isDefaultRead: true,
        isDefaultWrite: true,
        config: qdrantCollectionData.config,
        deletedAt: null,
      },
    });

    return {
      chunkingConfig,
      embeddingModel,
      embeddingConfig,
      qdrantCollection,
    };
  });
}

/**
 * Resolve a trimmed text value with a fallback.
 * @param value - The source text value.
 * @param fallback - Fallback value when source text is empty.
 * @returns The resolved text value.
 */
function resolveTextValue(value: string | undefined, fallback: string): string {
  const textValue = value?.trim();

  return textValue && textValue.length > 0 ? textValue : fallback;
}

/**
 * Resolve a positive integer with a fallback.
 * @param value - The source integer value.
 * @param fallback - Fallback integer when source value is invalid.
 * @returns The resolved positive integer.
 */
function resolvePositiveInteger(
  value: string | undefined,
  fallback: number
): number {
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

/**
 * Resolve a non-negative integer with a fallback.
 * @param value - The source integer value.
 * @param fallback - Fallback integer when source value is invalid.
 * @returns The resolved non-negative integer.
 */
function resolveNonNegativeInteger(
  value: string | undefined,
  fallback: number
): number {
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue >= 0
    ? parsedValue
    : fallback;
}
