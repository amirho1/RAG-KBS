import { INestApplicationContext } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module.js";
import { PinoLoggerService } from "../common/logger/pino-logger.service.js";
import appConfig from "../config/app.config.js";
import { HealthService } from "../modules/health/health.service.js";
import { writeWorkerReadyFile } from "./worker-ready-file.js";

const readinessRetryDelayMs = 5_000;

/**
 * Start the ingestion worker process.
 */
async function bootstrapIngestionWorker(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = app.get(PinoLoggerService);
  const { workerReadyFile } = app.get<ConfigType<typeof appConfig>>(
    appConfig.KEY
  );
  const keepAliveTimer = setInterval(() => undefined, 2_147_483_647);

  app.useLogger(logger);
  app.enableShutdownHooks();
  registerShutdownHandlers(app, keepAliveTimer, logger);

  await waitForWorkerReadiness(app, workerReadyFile, logger);
  logger.info(
    {
      event: "worker.started",
      workerReadyFile,
    },
    "Ingestion worker started and is waiting for jobs."
  );
}

/**
 * Wait until all critical dependencies are healthy, then write the readiness file.
 * @param app - The Nest application context.
 * @param workerReadyFile - Path to the worker readiness file.
 */
async function waitForWorkerReadiness(
  app: INestApplicationContext,
  workerReadyFile: string,
  logger: PinoLoggerService
): Promise<void> {
  const healthService = app.get(HealthService);

  while (true) {
    const readiness = await healthService.checkReadiness();

    if (readiness.status === "ok") {
      await writeWorkerReadyFile(workerReadyFile);
      logger.info(
        {
          event: "worker.readiness.verified",
          workerReadyFile,
        },
        "Worker readiness verified and ready file written."
      );
      return;
    }

    logger.errorPayload({
      event: "worker.readiness.failed",
      message: "Worker readiness check failed",
      dependencies: readiness.dependencies,
    });

    await delay(readinessRetryDelayMs);
  }
}

/**
 * Delay execution for the specified duration.
 * @param delayMs - Delay duration in milliseconds.
 */
function delay(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

/**
 * Register graceful shutdown handlers for the worker process.
 * @param app - The Nest application context.
 * @param keepAliveTimer - The timer that keeps the worker process alive.
 */
function registerShutdownHandlers(
  app: INestApplicationContext,
  keepAliveTimer: NodeJS.Timeout,
  logger: PinoLoggerService
): void {
  const shutdownSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

  for (const shutdownSignal of shutdownSignals) {
    process.once(shutdownSignal, () => {
      void shutdownIngestionWorker(app, keepAliveTimer, shutdownSignal, logger);
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
  shutdownSignal: NodeJS.Signals,
  logger: PinoLoggerService
): Promise<void> {
  logger.info(
    {
      event: "worker.shutdown",
      shutdownSignal,
    },
    `Received ${shutdownSignal}. Shutting down ingestion worker.`
  );
  clearInterval(keepAliveTimer);
  await app.close();
  process.exit(0);
}

void bootstrapIngestionWorker();
