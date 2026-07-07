import {
  DistanceMetric,
  EmbeddingProvider,
  QdrantCollectionStatus,
} from "../../generated/prisma/enums.js";
import type { Prisma } from "../../generated/prisma/client.js";

const defaultTenantId = "default";
const defaultEmbeddingModel = "text-embedding-3-small";
const defaultEmbeddingDimension = 1536;
const defaultQdrantCollection = "rag_kbs_default";
const defaultChunkingConfigName = "Default Recursive Text Chunking";
const defaultEmbeddingConfigName = "Default Embedding Config";
const defaultTokenizer = "APPROXIMATE";

export type DefaultSeedConfig = {
  tenantId: string;
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
 * @param tenantId - Tenant ID for the default config.
 * @returns Default chunking config data.
 */
export function buildDefaultChunkingConfigData(
  tenantId: string
): DefaultChunkingConfigData {
  return {
    tenantId,
    name: defaultChunkingConfigName,
    strategy: "RECURSIVE_TEXT",
    chunkSize: 800,
    chunkOverlap: 120,
    tokenizer: defaultTokenizer,
    preserveHeadings: true,
    preserveParagraphs: true,
    preserveTables: false,
    isDefault: true,
    isActive: true,
    config: {
      seededBy: "prisma",
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
