import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";

/**
 * Reads tenant-scoped chunking configuration records.
 */
@Injectable()
export class ChunkingConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the active default chunking config for a tenant.
   * @param tenantId - Tenant ID.
   * @returns Default chunking config.
   */
  async getDefaultConfig(tenantId: string) {
    const config = await this.prisma.chunkingConfig.findFirst({
      where: {
        tenantId,
        isDefault: true,
        isActive: true,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!config) {
      throw new NotFoundException("Default chunking config was not found.");
    }

    return config;
  }
}
