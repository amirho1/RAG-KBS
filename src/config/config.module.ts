import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import appConfig from "./app.config.js";
import databaseConfig from "./database.config.js";
import embeddingConfig from "./embedding.config.js";
import ingestionConfig from "./ingestion.config.js";
import qdrantConfig from "./qdrant.config.js";
import redisConfig from "./redis.config.js";
import storageConfig from "./storage.config.js";
import { validateEnv } from "./validate-env.js";

/**
 * Global configuration module with Zod-validated environment variables.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV}.local`,
        `.env.${process.env.NODE_ENV}`,
        ".env.local",
        ".env",
      ],
      validate: validateEnv,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        qdrantConfig,
        storageConfig,
        embeddingConfig,
        ingestionConfig,
      ],
    }),
  ],
  exports: [ConfigModule],
})
export class AppConfigModule {}
