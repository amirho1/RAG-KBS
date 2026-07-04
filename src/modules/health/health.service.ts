import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import appConfig from "../../config/app.config.js";
import { PostgresHealthIndicator } from "./indicators/postgres.health-indicator.js";
import { QdrantHealthIndicator } from "./indicators/qdrant.health-indicator.js";
import { QueueHealthIndicator } from "./indicators/queue.health-indicator.js";
import { RedisHealthIndicator } from "./indicators/redis.health-indicator.js";
import { StorageHealthIndicator } from "./indicators/storage.health-indicator.js";
import type {
  DependencyHealthResult,
  DependencyName,
  DependencyResultsMap,
  LivenessResult,
  OverallHealthResult,
  ReadinessResult,
} from "./types/health.types.js";

/**
 * Orchestrates application and dependency health checks.
 */
@Injectable()
export class HealthService {
  constructor(
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
    private readonly postgresHealthIndicator: PostgresHealthIndicator,
    private readonly redisHealthIndicator: RedisHealthIndicator,
    private readonly qdrantHealthIndicator: QdrantHealthIndicator,
    private readonly storageHealthIndicator: StorageHealthIndicator,
    private readonly queueHealthIndicator: QueueHealthIndicator
  ) {}

  /**
   * Return process liveness without checking external dependencies.
   * @returns The liveness health payload.
   */
  getLiveness(): LivenessResult {
    return {
      status: "ok",
      service: this.app.serviceName,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  /**
   * Check readiness of all critical dependencies.
   * @returns The readiness health payload.
   */
  async checkReadiness(): Promise<ReadinessResult> {
    const dependencies = await this.checkAllDependencies();

    return {
      status: this.isDependenciesHealthy(dependencies) ? "ok" : "error",
      dependencies,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Return an overall health summary including liveness and dependencies.
   * @returns The overall health payload.
   */
  async getOverallHealth(): Promise<OverallHealthResult> {
    const liveness = this.getLiveness();
    const dependencies = await this.checkAllDependencies();
    const dependenciesHealthy = this.isDependenciesHealthy(dependencies);

    return {
      status: liveness.status === "ok" && dependenciesHealthy ? "ok" : "error",
      service: this.app.serviceName,
      environment: this.app.nodeEnv,
      version: this.app.version,
      uptimeSeconds: liveness.uptimeSeconds,
      timestamp: new Date().toISOString(),
      dependencies,
    };
  }

  /**
   * Check a single dependency by name.
   * @param dependencyName - The dependency to check.
   * @returns The dependency health result.
   */
  async checkDependency(
    dependencyName: DependencyName
  ): Promise<DependencyHealthResult> {
    switch (dependencyName) {
      case "postgres":
        return this.postgresHealthIndicator.check();
      case "redis":
        return this.redisHealthIndicator.check();
      case "qdrant":
        return this.qdrantHealthIndicator.check();
      case "storage":
        return this.storageHealthIndicator.check();
      case "queue":
        return this.queueHealthIndicator.check();
    }
  }

  /**
   * Run all dependency health checks in parallel.
   * @returns A map of dependency health results.
   */
  private async checkAllDependencies(): Promise<DependencyResultsMap> {
    const [postgres, redis, qdrant, storage, queue] = await Promise.all([
      this.postgresHealthIndicator.check(),
      this.redisHealthIndicator.check(),
      this.qdrantHealthIndicator.check(),
      this.storageHealthIndicator.check(),
      this.queueHealthIndicator.check(),
    ]);

    return {
      postgres,
      redis,
      qdrant,
      storage,
      queue,
    };
  }

  /**
   * Determine whether all dependency checks passed.
   * @param dependencies - Dependency health results.
   * @returns True when every dependency is healthy.
   */
  private isDependenciesHealthy(dependencies: DependencyResultsMap): boolean {
    return Object.values(dependencies).every(
      (dependency) => dependency?.status === "ok"
    );
  }
}
