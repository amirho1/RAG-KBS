import { INestApplicationContext, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module.js";
import appConfig from "../config/app.config.js";
import { writeWorkerReadyFile } from "./worker-ready-file.js";

const logger = new Logger("IngestionWorker");

/**
 * Start the ingestion worker process.
 */
async function bootstrapIngestionWorker(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const { workerReadyFile } = app.get<ConfigType<typeof appConfig>>(
    appConfig.KEY
  );
  const keepAliveTimer = setInterval(() => undefined, 2_147_483_647);

  app.enableShutdownHooks();
  registerShutdownHandlers(app, keepAliveTimer);

  await writeWorkerReadyFile(workerReadyFile);
  logger.log("Ingestion worker started and is waiting for jobs.");
}

/**
 * Register graceful shutdown handlers for the worker process.
 * @param app - The Nest application context.
 * @param keepAliveTimer - The timer that keeps the worker process alive.
 */
function registerShutdownHandlers(
  app: INestApplicationContext,
  keepAliveTimer: NodeJS.Timeout
): void {
  const shutdownSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

  for (const shutdownSignal of shutdownSignals) {
    process.once(shutdownSignal, () => {
      void shutdownIngestionWorker(app, keepAliveTimer, shutdownSignal);
    });
  }
}

/**
 * Stop the worker process cleanly.
 * @param app - The Nest application context.
 * @param keepAliveTimer - The timer that keeps the worker process alive.
 * @param shutdownSignal - The signal that triggered shutdown.
 */
async function shutdownIngestionWorker(
  app: INestApplicationContext,
  keepAliveTimer: NodeJS.Timeout,
  shutdownSignal: NodeJS.Signals
): Promise<void> {
  logger.log(`Received ${shutdownSignal}. Shutting down ingestion worker.`);
  clearInterval(keepAliveTimer);
  await app.close();
  process.exit(0);
}

void bootstrapIngestionWorker();
