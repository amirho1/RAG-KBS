import {
  Controller,
  Get,
  HttpStatus,
  Res,
  VERSION_NEUTRAL,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import { HealthService } from "./health.service.js";
import type {
  DependencyHealthResult,
  LivenessResult,
  OverallHealthResult,
  ReadinessResult,
} from "./types/health.types.js";

/**
 * Health check HTTP endpoints.
 */
@ApiTags("Health")
@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Return process liveness without checking external dependencies.
   * @returns The liveness health payload.
   */
  @Get("live")
  @ApiOkResponse({
    description: "The API process is alive.",
    schema: {
      example: {
        status: "ok",
        service: "rag-kbs-api",
        timestamp: "2026-07-04T00:00:00.000Z",
        uptimeSeconds: 120,
      },
    },
  })
  getLive(): LivenessResult {
    return this.healthService.getLiveness();
  }

  /**
   * Return readiness based on all critical dependencies.
   * @param response - Express response used to set HTTP status code.
   * @returns The readiness health payload.
   */
  @Get("ready")
  @ApiOkResponse({
    description: "All critical dependencies are healthy.",
  })
  @ApiServiceUnavailableResponse({
    description: "One or more critical dependencies are unhealthy.",
  })
  async getReady(
    @Res({ passthrough: true }) response: Response
  ): Promise<ReadinessResult> {
    const readiness = await this.healthService.checkReadiness();
    this.setStatusFromHealth(response, readiness.status);

    return readiness;
  }

  /**
   * Return an overall health summary.
   * @param response - Express response used to set HTTP status code.
   * @returns The overall health payload.
   */
  @Get()
  @ApiOkResponse({
    description: "Overall health summary including dependency statuses.",
  })
  @ApiServiceUnavailableResponse({
    description: "One or more health checks failed.",
  })
  async getOverallHealth(
    @Res({ passthrough: true }) response: Response
  ): Promise<OverallHealthResult> {
    const overallHealth = await this.healthService.getOverallHealth();
    this.setStatusFromHealth(response, overallHealth.status);

    return overallHealth;
  }

  /**
   * Check PostgreSQL connectivity.
   * @param response - Express response used to set HTTP status code.
   * @returns The PostgreSQL health result.
   */
  @Get("postgres")
  @ApiOkResponse({ description: "PostgreSQL is healthy." })
  @ApiServiceUnavailableResponse({ description: "PostgreSQL is unhealthy." })
  async getPostgresHealth(
    @Res({ passthrough: true }) response: Response
  ): Promise<DependencyHealthResult> {
    return this.getDependencyHealth(response, "postgres");
  }

  /**
   * Check Redis connectivity.
   * @param response - Express response used to set HTTP status code.
   * @returns The Redis health result.
   */
  @Get("redis")
  @ApiOkResponse({ description: "Redis is healthy." })
  @ApiServiceUnavailableResponse({ description: "Redis is unhealthy." })
  async getRedisHealth(
    @Res({ passthrough: true }) response: Response
  ): Promise<DependencyHealthResult> {
    return this.getDependencyHealth(response, "redis");
  }

  /**
   * Check Qdrant connectivity.
   * @param response - Express response used to set HTTP status code.
   * @returns The Qdrant health result.
   */
  @Get("qdrant")
  @ApiOkResponse({ description: "Qdrant is healthy." })
  @ApiServiceUnavailableResponse({ description: "Qdrant is unhealthy." })
  async getQdrantHealth(
    @Res({ passthrough: true }) response: Response
  ): Promise<DependencyHealthResult> {
    return this.getDependencyHealth(response, "qdrant");
  }

  /**
   * Check object storage connectivity.
   * @param response - Express response used to set HTTP status code.
   * @returns The storage health result.
   */
  @Get("storage")
  @ApiOkResponse({ description: "Object storage is healthy." })
  @ApiServiceUnavailableResponse({
    description: "Object storage is unhealthy.",
  })
  async getStorageHealth(
    @Res({ passthrough: true }) response: Response
  ): Promise<DependencyHealthResult> {
    return this.getDependencyHealth(response, "storage");
  }

  /**
   * Check BullMQ queue readiness.
   * @param response - Express response used to set HTTP status code.
   * @returns The queue health result.
   */
  @Get("queue")
  @ApiOkResponse({ description: "Queue is healthy." })
  @ApiServiceUnavailableResponse({ description: "Queue is unhealthy." })
  async getQueueHealth(
    @Res({ passthrough: true }) response: Response
  ): Promise<DependencyHealthResult> {
    return this.getDependencyHealth(response, "queue");
  }

  /**
   * Run a single dependency health check and set HTTP status.
   * @param response - Express response used to set HTTP status code.
   * @param dependencyName - The dependency to check.
   * @returns The dependency health result.
   */
  private async getDependencyHealth(
    response: Response,
    dependencyName: "postgres" | "redis" | "qdrant" | "storage" | "queue"
  ): Promise<DependencyHealthResult> {
    const dependencyHealth =
      await this.healthService.checkDependency(dependencyName);
    this.setStatusFromHealth(response, dependencyHealth.status);

    return dependencyHealth;
  }

  /**
   * Map health status to HTTP status code.
   * @param response - Express response used to set HTTP status code.
   * @param status - Health status value.
   */
  private setStatusFromHealth(
    response: Response,
    status: "ok" | "error"
  ): void {
    response.status(
      status === "ok" ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE
    );
  }
}
