import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import databaseConfig from "../../config/database.config.js";
import { PrismaClient } from "../../generated/prisma/client.js";

/**
 * Remove sensitive database connection details from error messages.
 * @param error - The error to sanitize.
 * @returns The sanitized error message.
 */
function sanitizeDatabaseError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return message
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgresql://<credentials>@")
    .replace(/password=([^&\s]+)/gi, "password=<redacted>");
}

/**
 * Normalize unknown caught values to error objects.
 * @param error - The caught value.
 * @returns A normalized error object.
 */
function toDatabaseError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Prisma database service backed by the PostgreSQL driver adapter.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor(
    @Inject(databaseConfig.KEY)
    database: ConfigType<typeof databaseConfig>
  ) {
    const pool = new Pool({ connectionString: database.url });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  /**
   * Connect to the database when the module initializes.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (error) {
      const databaseError = toDatabaseError(error);

      this.logger.error({
        message: "Failed to connect to PostgreSQL.",
        error: sanitizeDatabaseError(databaseError),
      });

      throw databaseError;
    }
  }

  /**
   * Disconnect from the database when the module is destroyed.
   */
  async onModuleDestroy(): Promise<void> {
    let disconnectError: Error | undefined;

    try {
      await this.$disconnect();
    } catch (error) {
      disconnectError = toDatabaseError(error);
      this.logger.error({
        message: "Failed to disconnect Prisma client.",
        error: sanitizeDatabaseError(disconnectError),
      });
    }

    try {
      await this.pool.end();
    } catch (error) {
      const poolError = toDatabaseError(error);

      this.logger.error({
        message: "Failed to close PostgreSQL connection pool.",
        error: sanitizeDatabaseError(poolError),
      });

      if (!disconnectError) {
        throw poolError;
      }
    }

    if (disconnectError) {
      throw disconnectError;
    }
  }
}
