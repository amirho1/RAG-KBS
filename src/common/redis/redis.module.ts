import { Global, Module } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import Redis from "ioredis";
import redisConfig from "../../config/redis.config.js";
import { REDIS_CLIENT } from "./redis.constants.js";

/**
 * Global Redis client module.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [redisConfig.KEY],
      useFactory: (config: ConfigType<typeof redisConfig>): Redis => {
        return new Redis(config.url, {
          maxRetriesPerRequest: null,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
