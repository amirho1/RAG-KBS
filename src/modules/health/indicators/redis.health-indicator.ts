import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import type { Redis } from "ioredis";
import healthConfig from "../../../config/health.config.js";
import { REDIS_CLIENT } from "../../../common/redis/redis.constants.js";
import type { DependencyHealthResult } from "../types/health.types.js";
import {
  buildErrorDependencyResult,
  buildOkDependencyResult,
} from "../utils/build-dependency-result.js";
import { sanitizeHealthError } from "../utils/sanitize-health-error.js";
import { runWithTimeout } from "../utils/with-timeout.js";

const dependencyName = "redis";
const failureMessage = "Redis health check failed";

/**
 * Redis health indicator using a shared Redis client.
 */
@Injectable()
export class RedisHealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis,
    @Inject(healthConfig.KEY)
    private readonly health: ConfigType<typeof healthConfig>
  ) {}

  /**
   * Check Redis connectivity with PING.
   * @returns The Redis health result.
   */
  async check(): Promise<DependencyHealthResult> {
    const startedAt = Date.now();

    try {
      const pingResponse = await runWithTimeout(
        this.redisClient.ping(),
        this.health.redisTimeoutMs,
        dependencyName
      );

      if (pingResponse !== "PONG") {
        throw new Error("Redis PING did not return PONG");
      }

      return buildOkDependencyResult(dependencyName, Date.now() - startedAt);
    } catch (error) {
      const message = sanitizeHealthError(error, failureMessage);
      this.logger.error({ dependency: dependencyName, message });

      return buildErrorDependencyResult(dependencyName, failureMessage);
    }
  }
}
