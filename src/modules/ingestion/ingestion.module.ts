import { Module } from "@nestjs/common";
import { PrismaModule } from "../database/prisma.module.js";
import { IngestionController } from "./ingestion.controller.js";
import { MarkdownParser } from "./parsers/markdown.parser.js";
import { TextParser } from "./parsers/text.parser.js";
import { DocumentParserService } from "./services/document-parser.service.js";
import { IngestionAttemptService } from "./services/ingestion-attempt.service.js";
import { IngestionIdempotencyService } from "./services/ingestion-idempotency.service.js";
import { IngestionJobService } from "./services/ingestion-job.service.js";
import { IngestionQueueService } from "./services/ingestion-queue.service.js";
import { IngestionService } from "./services/ingestion.service.js";

/**
 * File ingestion API module.
 */
@Module({
  imports: [PrismaModule],
  controllers: [IngestionController],
  providers: [
    TextParser,
    MarkdownParser,
    DocumentParserService,
    IngestionIdempotencyService,
    IngestionQueueService,
    IngestionJobService,
    IngestionAttemptService,
    IngestionService,
  ],
  exports: [
    DocumentParserService,
    IngestionAttemptService,
    IngestionJobService,
    IngestionQueueService,
  ],
})
export class IngestionModule {}
