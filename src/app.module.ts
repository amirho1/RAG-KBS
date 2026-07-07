import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { ObservabilityModule } from "./common/observability.module.js";
import { AppConfigModule } from "./config/config.module.js";
import { ChunksModule } from "./modules/chunks/chunks.module.js";
import { ChunkingModule } from "./modules/chunking/chunking.module.js";
import { EmbeddingsModule } from "./modules/embeddings/embeddings.module.js";
import { FilesModule } from "./modules/files/files.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { IngestionModule } from "./modules/ingestion/ingestion.module.js";
import { KnowledgeBasesModule } from "./modules/knowledge-bases/knowledge-bases.module.js";
import { SourcesModule } from "./modules/sources/sources.module.js";
import { StorageModule } from "./modules/storage/storage.module.js";
import { StorageObjectsModule } from "./modules/storage-objects/storage-objects.module.js";
import { TagsModule } from "./modules/tags/tags.module.js";
import { QdrantModule } from "./modules/qdrant/qdrant.module.js";
import { RetrievalModule } from "./modules/retrieval/retrieval.module.js";

@Module({
  imports: [
    AppConfigModule,
    ObservabilityModule,
    HealthModule,
    KnowledgeBasesModule,
    SourcesModule,
    StorageModule,
    StorageObjectsModule,
    FilesModule,
    TagsModule,
    ChunkingModule,
    EmbeddingsModule,
    QdrantModule,
    ChunksModule,
    IngestionModule,
    RetrievalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
