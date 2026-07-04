import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { HealthStatus } from "./health-status.type.js";
import { HealthService } from "./health.service.js";

@ApiTags("Health")
@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Return the API health status for container health checks.
   * @returns The API health status payload.
   */
  @Get()
  @ApiOkResponse({
    description: "The RAG-KBS API is running and can serve requests.",
    schema: {
      example: {
        status: "ok",
        service: "rag-kbs",
        timestamp: "2026-07-04T00:00:00.000Z",
        uptimeSeconds: 42,
      },
    },
  })
  getHealthStatus(): HealthStatus {
    return this.healthService.getHealthStatus();
  }
}
