import { Module } from "@nestjs/common";
import { ObservabilityModule } from "../common/observability.module.js";
import { AppConfigModule } from "../config/config.module.js";
import { HealthModule } from "../modules/health/health.module.js";
import { IngestionModule } from "../modules/ingestion/ingestion.module.js";
import { IngestionProcessor } from "../modules/ingestion/processors/ingestion.processor.js";
import { StorageModule } from "../modules/storage/storage.module.js";
import { IngestionWorkerRunner } from "./ingestion-worker.runner.js";

/**
 * Worker-only Nest module.
 */
@Module({
  imports: [
    AppConfigModule,
    ObservabilityModule,
    HealthModule,
    StorageModule,
    IngestionModule,
  ],
  providers: [IngestionProcessor, IngestionWorkerRunner],
  exports: [IngestionWorkerRunner],
})
export class WorkerModule {}
