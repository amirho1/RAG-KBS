import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import type { Redis } from "ioredis";
import { REDIS_CLIENT } from "./redis.constants.js";

/**
 * Owns shutdown behavior for the shared Redis client.
 */
@Injectable()
export class RedisLifecycleService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis
  ) {}

  /**
   * Close the Redis connection when Nest shuts the module down.
   */
  async onModuleDestroy(): Promise<void> {
    if (this.redisClient.status === "end") {
      return;
    }

    try {
      await this.redisClient.quit();
    } finally {
      this.redisClient.disconnect();
    }
  }
}
