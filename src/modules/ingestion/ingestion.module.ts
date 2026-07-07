import { Module } from "@nestjs/common";
import { ChunkingModule } from "../chunking/chunking.module.js";
import { PrismaModule } from "../database/prisma.module.js";
import { EmbeddingsModule } from "../embeddings/embeddings.module.js";
import { QdrantModule } from "../qdrant/qdrant.module.js";
import { IngestionController } from "./ingestion.controller.js";
import { MarkdownParser } from "./parsers/markdown.parser.js";
import { TextParser } from "./parsers/text.parser.js";
import { DocumentParserService } from "./services/document-parser.service.js";
import { IngestionAttemptService } from "./services/ingestion-attempt.service.js";
import { IngestionIdempotencyService } from "./services/ingestion-idempotency.service.js";
import { IngestionJobService } from "./services/ingestion-job.service.js";
import { IngestionQueueService } from "./services/ingestion-queue.service.js";
import { IngestionService } from "./services/ingestion.service.js";
import { IndexingPipelineService } from "./services/indexing-pipeline.service.js";

/**
 * File ingestion API module.
 */
@Module({
  imports: [PrismaModule, ChunkingModule, EmbeddingsModule, QdrantModule],
  controllers: [IngestionController],
  providers: [
    TextParser,
    MarkdownParser,
    DocumentParserService,
    IngestionIdempotencyService,
    IngestionQueueService,
    IngestionJobService,
    IngestionAttemptService,
    IndexingPipelineService,
    IngestionService,
  ],
  exports: [
    DocumentParserService,
    IngestionAttemptService,
    IngestionJobService,
    IngestionQueueService,
    IndexingPipelineService,
  ],
})
export class IngestionModule {}
