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
const requiredSchemaTables = ["_prisma_migrations", "knowledge_bases"] as const;

type SchemaTableRow = {
  tableName: string;
};

type MigrationStatusRow = {
  appliedMigrationCount: number | bigint | string;
  failedMigrationCount: number | bigint | string;
};

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
      await this.checkSchemaReadiness();

      return buildOkDependencyResult(dependencyName, Date.now() - startedAt);
    } catch (error) {
      const message = sanitizeHealthError(error, failureMessage);
      this.logger.error({ dependency: dependencyName, message });

      return buildErrorDependencyResult(dependencyName, failureMessage);
    }
  }

  /**
   * Check that PostgreSQL is reachable and the application schema is migrated.
   */
  private async checkSchemaReadiness(): Promise<void> {
    const schemaTables = await runWithTimeout(
      this.prismaService.$queryRaw<SchemaTableRow[]>`
        SELECT table_name AS "tableName"
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('_prisma_migrations', 'knowledge_bases')
      `,
      this.health.postgresTimeoutMs,
      dependencyName
    );
    const missingTables = getMissingRequiredSchemaTables(schemaTables);

    if (missingTables.length > 0) {
      throw new Error(
        `PostgreSQL schema is missing required tables: ${missingTables.join(", ")}`
      );
    }

    const [migrationStatus] = await runWithTimeout(
      this.prismaService.$queryRaw<MigrationStatusRow[]>`
        SELECT
          COUNT(*) FILTER (
            WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
          ) AS "appliedMigrationCount",
          COUNT(*) FILTER (
            WHERE finished_at IS NULL AND rolled_back_at IS NULL
          ) AS "failedMigrationCount"
        FROM "_prisma_migrations"
      `,
      this.health.postgresTimeoutMs,
      dependencyName
    );

    if (!migrationStatus) {
      throw new Error("PostgreSQL migration status could not be read.");
    }

    if (toNumber(migrationStatus.appliedMigrationCount) === 0) {
      throw new Error("PostgreSQL schema has no applied Prisma migrations.");
    }

    if (toNumber(migrationStatus.failedMigrationCount) > 0) {
      throw new Error("PostgreSQL schema has a failed Prisma migration.");
    }
  }
}

/**
 * Find required schema tables that are missing from PostgreSQL.
 * @param rows - Schema table rows returned from information_schema.
 * @returns Missing required table names.
 */
function getMissingRequiredSchemaTables(rows: SchemaTableRow[]): string[] {
  const tableNames = new Set(rows.map((row) => row.tableName));

  return requiredSchemaTables.filter((tableName) => !tableNames.has(tableName));
}

/**
 * Convert PostgreSQL numeric aggregate values into numbers.
 * @param value - Aggregate value returned by the database driver.
 * @returns Numeric value.
 */
function toNumber(value: number | bigint | string): number {
  return Number(value);
}
