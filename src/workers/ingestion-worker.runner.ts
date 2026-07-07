import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { Job, Worker } from "bullmq";
import ingestionConfig from "../config/ingestion.config.js";
import redisConfig from "../config/redis.config.js";
import { JobLoggerService } from "../common/logger/job-logger.service.js";
import { PinoLoggerService } from "../common/logger/pino-logger.service.js";
import { ingestionBullJobName } from "../modules/ingestion/ingestion.constants.js";
import { IngestionProcessor } from "../modules/ingestion/processors/ingestion.processor.js";
import type { IngestionQueuePayload } from "../modules/ingestion/ingestion.types.js";

/**
 * Owns the BullMQ ingestion worker instance.
 */
@Injectable()
export class IngestionWorkerRunner implements OnModuleDestroy {
  private worker: Worker<IngestionQueuePayload> | undefined;

  constructor(
    private readonly processor: IngestionProcessor,
    private readonly jobLogger: JobLoggerService,
    private readonly logger: PinoLoggerService,
    @Inject(redisConfig.KEY)
    private readonly redis: ConfigType<typeof redisConfig>,
    @Inject(ingestionConfig.KEY)
    private readonly ingestion: ConfigType<typeof ingestionConfig>
  ) {}

  /**
   * Start consuming ingestion jobs.
   */
  async start(): Promise<void> {
    if (this.worker) {
      return;
    }

    this.worker = new Worker<IngestionQueuePayload>(
      this.ingestion.queueName,
      (job) => this.processJob(job),
      {
        connection: {
          host: this.redis.host,
          port: this.redis.port,
          password:
            this.redis.password.length > 0 ? this.redis.password : undefined,
          maxRetriesPerRequest: null,
        },
        prefix: this.redis.queuePrefix,
        concurrency: this.ingestion.concurrency,
        removeOnComplete: {
          count: this.ingestion.removeOnCompleteCount,
        },
        removeOnFail: {
          count: this.ingestion.removeOnFailCount,
        },
      }
    );

    this.worker.on("stalled", (jobId) => {
      this.logger.warnPayload({
        event: "ingestion.job.stalled",
        jobId,
        queueName: this.ingestion.queueName,
      });
    });

    await this.worker.waitUntilReady();
  }

  /**
   * Close the worker during shutdown.
   */
  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = undefined;
    }
  }

  /**
   * Process a BullMQ job with safe lifecycle logs.
   * @param job - BullMQ job.
   */
  private async processJob(job: Job<IngestionQueuePayload>): Promise<void> {
    const startedAt = Date.now();
    await this.jobLogger.logStarted(job);

    try {
      await this.processor.process(job);
      await this.jobLogger.logCompleted(job, {
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      if (shouldLogRetrying(job)) {
        await this.jobLogger.logRetrying(job, error, {
          durationMs: Date.now() - startedAt,
        });
      } else {
        await this.jobLogger.logFailed(job, error, {
          durationMs: Date.now() - startedAt,
        });
      }

      throw error;
    }
  }
}

/**
 * Decide whether the failed job still has BullMQ attempts left.
 * @param job - BullMQ job.
 * @returns True when another attempt remains.
 */
function shouldLogRetrying(job: Job<IngestionQueuePayload>): boolean {
  const maxAttempts = job.opts.attempts ?? 1;
  const currentAttempt = job.attemptsMade + 1;

  return job.name === ingestionBullJobName && currentAttempt < maxAttempts;
}
