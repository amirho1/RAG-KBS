import { Module } from "@nestjs/common";
import { RedisModule } from "../../common/redis/redis.module.js";
import { PrismaModule } from "../database/prisma.module.js";
import { HealthController } from "./health.controller.js";
import { HealthService } from "./health.service.js";
import { PostgresHealthIndicator } from "./indicators/postgres.health-indicator.js";
import { QdrantHealthIndicator } from "./indicators/qdrant.health-indicator.js";
import { QueueHealthIndicator } from "./indicators/queue.health-indicator.js";
import { RedisHealthIndicator } from "./indicators/redis.health-indicator.js";
import { StorageHealthIndicator } from "./indicators/storage.health-indicator.js";

/**
 * Application health check module.
 */
@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    PostgresHealthIndicator,
    RedisHealthIndicator,
    QdrantHealthIndicator,
    StorageHealthIndicator,
    QueueHealthIndicator,
  ],
  exports: [HealthService],
})
export class HealthModule {}
