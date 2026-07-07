import { Module } from "@nestjs/common";
import { PrismaModule } from "../database/prisma.module.js";
import { EmbeddingsModule } from "../embeddings/embeddings.module.js";
import { QdrantModule } from "../qdrant/qdrant.module.js";
import { RetrievalController } from "./retrieval.controller.js";
import { RetrievalFilterService } from "./services/retrieval-filter.service.js";
import { RetrievalQueryService } from "./services/retrieval-query.service.js";
import { RetrievalResponseMapperService } from "./services/retrieval-response-mapper.service.js";
import { RetrievalResultService } from "./services/retrieval-result.service.js";
import { RetrievalService } from "./services/retrieval.service.js";

/**
 * Retrieval API module.
 */
@Module({
  imports: [PrismaModule, EmbeddingsModule, QdrantModule],
  controllers: [RetrievalController],
  providers: [
    RetrievalFilterService,
    RetrievalQueryService,
    RetrievalResponseMapperService,
    RetrievalResultService,
    RetrievalService,
  ],
  exports: [RetrievalService],
})
export class RetrievalModule {}
