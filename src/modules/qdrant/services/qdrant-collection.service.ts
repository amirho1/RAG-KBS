import { Injectable, NotFoundException } from "@nestjs/common";
import { QdrantCollectionStatus } from "../../../generated/prisma/enums.js";
import { PrismaService } from "../../database/prisma.service.js";

/**
 * Reads tenant-scoped Qdrant collection metadata.
 */
@Injectable()
export class QdrantCollectionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the active default read collection for a tenant.
   * @param tenantId - Tenant ID.
   * @returns Default read collection.
   */
  async getDefaultReadCollection(tenantId: string) {
    const collection = await this.prisma.qdrantCollection.findFirst({
      where: {
        tenantId,
        isDefaultRead: true,
        status: QdrantCollectionStatus.ACTIVE,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!collection) {
      throw new NotFoundException(
        "Default read Qdrant collection was not found."
      );
    }

    return collection;
  }

  /**
   * Get the active default write collection for a tenant.
   * @param tenantId - Tenant ID.
   * @returns Default write collection.
   */
  async getDefaultWriteCollection(tenantId: string) {
    const collection = await this.prisma.qdrantCollection.findFirst({
      where: {
        tenantId,
        isDefaultWrite: true,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!collection) {
      throw new NotFoundException("Default Qdrant collection was not found.");
    }

    return collection;
  }
}
