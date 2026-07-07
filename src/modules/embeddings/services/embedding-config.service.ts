import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";

/**
 * Reads tenant-scoped embedding configuration records.
 */
@Injectable()
export class EmbeddingConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the active default embedding config for a tenant.
   * @param tenantId - Tenant ID.
   * @returns Default embedding config with model.
   */
  async getDefaultConfig(tenantId: string) {
    const config = await this.prisma.embeddingConfig.findFirst({
      where: {
        tenantId,
        isDefault: true,
        isActive: true,
      },
      include: {
        embeddingModel: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!config) {
      throw new NotFoundException("Default embedding config was not found.");
    }

    return config;
  }
}
