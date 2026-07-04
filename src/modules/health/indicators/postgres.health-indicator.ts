import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import healthConfig from "../../../config/health.config.js";
import { PrismaService } from "../../database/prisma.service.js";
import type { DependencyHealthResult } from "../types/health.types.js";
import {
  buildErrorDependencyResult,
  buildOkDependencyResult,
} from "../utils/build-dependency-result.js";
import { sanitizeHealthError } from "../utils/sanitize-health-error.js";
import { runWithTimeout } from "../utils/with-timeout.js";

const dependencyName = "postgres";
const failureMessage = "PostgreSQL health check failed";

/**
 * PostgreSQL health indicator using Prisma.
 */
@Injectable()
export class PostgresHealthIndicator {
  private readonly logger = new Logger(PostgresHealthIndicator.name);

  constructor(
    private readonly prismaService: PrismaService,
    @Inject(healthConfig.KEY)
    private readonly health: ConfigType<typeof healthConfig>
  ) {}

  /**
   * Check PostgreSQL connectivity with a lightweight query.
   * @returns The PostgreSQL health result.
   */
  async check(): Promise<DependencyHealthResult> {
    const startedAt = Date.now();

    try {
      await runWithTimeout(
        this.prismaService.$queryRaw`SELECT 1`,
        this.health.postgresTimeoutMs,
        dependencyName
      );

      return buildOkDependencyResult(dependencyName, Date.now() - startedAt);
    } catch (error) {
      const message = sanitizeHealthError(error, failureMessage);
      this.logger.error({ dependency: dependencyName, message });

      return buildErrorDependencyResult(dependencyName, failureMessage);
    }
  }
}
