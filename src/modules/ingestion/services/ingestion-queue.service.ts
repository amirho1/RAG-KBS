import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { Job, Queue } from "bullmq";
import ingestionConfig from "../../../config/ingestion.config.js";
import redisConfig from "../../../config/redis.config.js";
import { ingestionBullJobName } from "../ingestion.constants.js";
import type { IngestionQueuePayload } from "../ingestion.types.js";

/**
 * Owns BullMQ ingestion queue producer operations.
 */
@Injectable()
export class IngestionQueueService implements OnModuleDestroy {
  private queue: Queue<IngestionQueuePayload> | undefined;

  constructor(
    @Inject(redisConfig.KEY)
    private readonly redis: ConfigType<typeof redisConfig>,
    @Inject(ingestionConfig.KEY)
    private readonly ingestion: ConfigType<typeof ingestionConfig>
  ) {}

  /**
   * Close the queue connection during shutdown.
   */
  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.queue = undefined;
    }
  }

  /**
   * Add an ingestion job to BullMQ.
   * @param payload - Safe BullMQ job payload.
   * @param priority - BullMQ job priority.
   * @returns BullMQ job ID.
   */
  async addIngestionJob(
    payload: IngestionQueuePayload,
    priority: number
  ): Promise<string> {
    const job = await this.getQueue().add(ingestionBullJobName, payload, {
      jobId: payload.ingestionJobId,
      priority,
      attempts: this.ingestion.maxAttempts,
      backoff: {
        type: "exponential",
        delay: this.ingestion.backoffDelayMs,
      },
      removeOnComplete: this.ingestion.removeOnCompleteCount,
      removeOnFail: this.ingestion.removeOnFailCount,
    });

    return String(job.id);
  }

  /**
   * Remove a queued BullMQ job when possible.
   * @param bullJobId - BullMQ job ID.
   * @returns True when the job was found and removed.
   */
  async removeJob(bullJobId: string | null | undefined): Promise<boolean> {
    if (!bullJobId) {
      return false;
    }

    const job = await this.getJob(bullJobId);

    if (!job) {
      return false;
    }

    await job.remove();

    return true;
  }

  /**
   * Get one BullMQ job by ID.
   * @param bullJobId - BullMQ job ID.
   * @returns BullMQ job when present.
   */
  async getJob(
    bullJobId: string
  ): Promise<Job<IngestionQueuePayload> | undefined> {
    return (await this.getQueue().getJob(bullJobId)) ?? undefined;
  }

  /**
   * Get or create the BullMQ queue.
   * @returns BullMQ queue.
   */
  private getQueue(): Queue<IngestionQueuePayload> {
    if (!this.queue) {
      this.queue = new Queue<IngestionQueuePayload>(this.ingestion.queueName, {
        connection: {
          host: this.redis.host,
          port: this.redis.port,
          password:
            this.redis.password.length > 0 ? this.redis.password : undefined,
          maxRetriesPerRequest: null,
        },
        prefix: this.redis.queuePrefix,
      });
    }

    return this.queue;
  }
}
