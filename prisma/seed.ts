import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { config } from "dotenv";
import { Pool } from "pg";
import {
  buildDefaultChunkingConfigData,
  buildDefaultEmbeddingConfigData,
  buildDefaultEmbeddingModelData,
  buildDefaultQdrantCollectionData,
  resolveDefaultSeedConfig,
  type DefaultSeedConfig,
} from "../src/modules/database/seed-defaults.js";

config();

/**
 * Seed safe default database records for RAG-KBS.
 */
async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed the database.");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$connect();
    await seedDefaultRecords(prisma, resolveDefaultSeedConfig(process.env));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

/**
 * Upsert default RAG database records.
 * @param prisma - Prisma client.
 * @param seedConfig - Resolved seed configuration.
 */
export async function seedDefaultRecords(
  prisma: PrismaClient,
  seedConfig: DefaultSeedConfig
): Promise<void> {
  const chunkingConfigData = buildDefaultChunkingConfigData(
    seedConfig.tenantId
  );

  const chunkingConfig = await prisma.chunkingConfig.upsert({
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
      preserveTables: chunkingConfigData.preserveTables,
      config: chunkingConfigData.config,
      isDefault: true,
      isActive: true,
    },
  });

  const embeddingModelData = buildDefaultEmbeddingModelData(seedConfig);

  const embeddingModel = await prisma.embeddingModel.upsert({
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

  const embeddingConfig = await prisma.embeddingConfig.upsert({
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

  await prisma.qdrantCollection.upsert({
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
    },
  });
}

/**
 * Remove credentials from database-related seed errors.
 * @param error - The seed error.
 * @returns The sanitized error message.
 */
function sanitizeSeedError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return message.replace(
    /postgres(?:ql)?:\/\/[^@\s]+@/gi,
    "postgresql://<credentials>@"
  );
}

void main().catch((error) => {
  console.error("Database seed failed.");
  console.error(sanitizeSeedError(error));
  process.exitCode = 1;
});
