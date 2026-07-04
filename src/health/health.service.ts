import { Injectable } from "@nestjs/common";
import { HealthStatus } from "./health-status.type.js";

@Injectable()
export class HealthService {
  /**
   * Get the current process health status.
   * @returns The API health status payload.
   */
  getHealthStatus(): HealthStatus {
    return {
      status: "ok",
      service: "rag-kbs",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
