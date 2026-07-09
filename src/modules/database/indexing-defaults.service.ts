import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import chunkingConfig from "../../config/chunking.config.js";
import embeddingConfig from "../../config/embedding.config.js";
import qdrantConfig from "../../config/qdrant.config.js";
import { PrismaService } from "./prisma.service.js";
import {
  resolveDistanceMetric,
  resolveEmbeddingProvider,
  upsertDefaultIndexingRecords,
  type DefaultIndexingRecords,
  type DefaultSeedConfig,
} from "./seed-defaults.js";

/**
 * Ensures tenant-scoped default indexing records exist before indexing.
 */
@Injectable()
export class IndexingDefaultsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(chunkingConfig.KEY)
    private readonly chunking: ConfigType<typeof chunkingConfig>,
    @Inject(embeddingConfig.KEY)
    private readonly embedding: ConfigType<typeof embeddingConfig>,
    @Inject(qdrantConfig.KEY)
    private readonly qdrant: ConfigType<typeof qdrantConfig>
  ) {}

  /**
   * Ensure default chunking, embedding, and Qdrant records exist for a tenant.
   * @param tenantId - Tenant ID that needs indexing defaults.
   * @returns The ensured default indexing records.
   */
  ensureTenantDefaults(tenantId: string): Promise<DefaultIndexingRecords> {
    return upsertDefaultIndexingRecords(
      this.prisma,
      this.buildSeedConfig(tenantId)
    );
  }

  /**
   * Build default seed config from validated runtime config.
   * @param tenantId - Tenant ID for tenant-scoped defaults.
   * @returns Default seed config.
   */
  private buildSeedConfig(tenantId: string): DefaultSeedConfig {
    return {
      tenantId,
      chunkingDefaultSize: this.chunking.defaultSize,
      chunkingDefaultOverlap: this.chunking.defaultOverlap,
      chunkingTextPreviewLength: this.chunking.textPreviewLength,
      chunkingMaxChunksPerDocument: this.chunking.maxChunksPerDocument,
      embeddingProvider: resolveEmbeddingProvider(this.embedding.provider),
      embeddingModel: this.embedding.model,
      embeddingDimension: this.embedding.dimension,
      embeddingDistanceMetric: resolveDistanceMetric(
        this.embedding.distanceMetric
      ),
      qdrantCollection: this.qdrant.collection,
      qdrantVectorSize: this.qdrant.vectorSize,
      qdrantDistanceMetric: resolveDistanceMetric(this.qdrant.distanceMetric),
    };
  }
}
