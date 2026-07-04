import { HealthService } from "./health.service.js";

describe("HealthService", () => {
  let healthService: HealthService;

  beforeEach(() => {
    healthService = new HealthService();
  });

  describe("getHealthStatus", () => {
    it("should return the current health status", () => {
      const healthStatus = healthService.getHealthStatus();

      expect(healthStatus.status).toBe("ok");
      expect(healthStatus.service).toBe("rag-kbs");
      expect(typeof healthStatus.timestamp).toBe("string");
      expect(Number.isNaN(Date.parse(healthStatus.timestamp))).toBe(false);
      expect(healthStatus.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });
});
