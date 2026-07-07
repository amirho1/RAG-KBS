import { Module } from "@nestjs/common";
import { PrismaModule } from "../database/prisma.module.js";
import { QdrantClientService } from "./services/qdrant-client.service.js";
import { QdrantCollectionService } from "./services/qdrant-collection.service.js";
import { QdrantPayloadService } from "./services/qdrant-payload.service.js";
import { QdrantService } from "./services/qdrant.service.js";

/**
 * Qdrant SDK integration module.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    QdrantClientService,
    QdrantService,
    QdrantCollectionService,
    QdrantPayloadService,
  ],
  exports: [QdrantService, QdrantCollectionService, QdrantPayloadService],
})
export class QdrantModule {}
