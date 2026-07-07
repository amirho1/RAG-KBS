import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";

/**
 * Reads active embedding model records.
 */
@Injectable()
export class EmbeddingModelService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the active default embedding model.
   * @returns Default embedding model.
   */
  async getDefaultModel() {
    const model = await this.prisma.embeddingModel.findFirst({
      where: {
        isDefault: true,
        isActive: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!model) {
      throw new NotFoundException("Default embedding model was not found.");
    }

    return model;
  }
}
