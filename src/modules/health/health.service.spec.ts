import { Test, TestingModule } from "@nestjs/testing";
import appConfig from "../../config/app.config.js";
import { HealthService } from "./health.service.js";
import { PostgresHealthIndicator } from "./indicators/postgres.health-indicator.js";
import { QdrantHealthIndicator } from "./indicators/qdrant.health-indicator.js";
import { QueueHealthIndicator } from "./indicators/queue.health-indicator.js";
import { RedisHealthIndicator } from "./indicators/redis.health-indicator.js";
import { StorageHealthIndicator } from "./indicators/storage.health-indicator.js";
import type { DependencyHealthResult } from "./types/health.types.js";

const timestamp = "2026-07-04T00:00:00.000Z";

function createDependencyResult(
  dependency: string,
  status: "ok" | "error" = "ok"
): DependencyHealthResult {
  if (status === "error") {
    return {
      status,
      dependency,
      message: `${dependency} health check failed`,
      timestamp,
    };
  }

  return {
    status,
    dependency,
    latencyMs: 5,
    timestamp,
  };
}

describe("HealthService", () => {
  let healthService: HealthService;
  let postgresHealthIndicator: { check: jest.Mock };
  let redisHealthIndicator: { check: jest.Mock };
  let qdrantHealthIndicator: { check: jest.Mock };
  let storageHealthIndicator: { check: jest.Mock };
  let queueHealthIndicator: { check: jest.Mock };

  beforeEach(async () => {
    postgresHealthIndicator = { check: jest.fn() };
    redisHealthIndicator = { check: jest.fn() };
    qdrantHealthIndicator = { check: jest.fn() };
    storageHealthIndicator = { check: jest.fn() };
    queueHealthIndicator = { check: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: appConfig.KEY,
          useValue: {
            serviceName: "rag-kbs-api",
            nodeEnv: "test",
            version: "0.0.1",
          },
        },
        {
          provide: PostgresHealthIndicator,
          useValue: postgresHealthIndicator,
        },
        {
          provide: RedisHealthIndicator,
          useValue: redisHealthIndicator,
        },
        {
          provide: QdrantHealthIndicator,
          useValue: qdrantHealthIndicator,
        },
        {
          provide: StorageHealthIndicator,
          useValue: storageHealthIndicator,
        },
        {
          provide: QueueHealthIndicator,
          useValue: queueHealthIndicator,
        },
      ],
    }).compile();

    healthService = moduleRef.get(HealthService);

    postgresHealthIndicator.check.mockResolvedValue(
      createDependencyResult("postgres")
    );
    redisHealthIndicator.check.mockResolvedValue(
      createDependencyResult("redis")
    );
    qdrantHealthIndicator.check.mockResolvedValue(
      createDependencyResult("qdrant")
    );
    storageHealthIndicator.check.mockResolvedValue(
      createDependencyResult("storage")
    );
    queueHealthIndicator.check.mockResolvedValue(
      createDependencyResult("queue")
    );
  });

  describe("getLiveness", () => {
    it("should return liveness without checking dependencies", () => {
      const liveness = healthService.getLiveness();

      expect(liveness.status).toBe("ok");
      expect(liveness.service).toBe("rag-kbs-api");
      expect(liveness.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(postgresHealthIndicator.check).not.toHaveBeenCalled();
    });
  });

  describe("checkReadiness", () => {
    it("should return ok when all dependencies pass", async () => {
      const readiness = await healthService.checkReadiness();

      expect(readiness.status).toBe("ok");
      expect(readiness.dependencies.postgres?.status).toBe("ok");
      expect(readiness.dependencies.queue?.status).toBe("ok");
    });

    it("should return error when one dependency fails", async () => {
      postgresHealthIndicator.check.mockResolvedValue(
        createDependencyResult("postgres", "error")
      );

      const readiness = await healthService.checkReadiness();

      expect(readiness.status).toBe("error");
      expect(readiness.dependencies.postgres?.status).toBe("error");
    });
  });

  describe("getOverallHealth", () => {
    it("should include environment and version in the summary", async () => {
      const overallHealth = await healthService.getOverallHealth();

      expect(overallHealth.environment).toBe("test");
      expect(overallHealth.version).toBe("0.0.1");
      expect(overallHealth.dependencies.redis?.dependency).toBe("redis");
    });
  });

  describe("checkDependency", () => {
    it("should delegate to the postgres indicator", async () => {
      const result = await healthService.checkDependency("postgres");

      expect(result.dependency).toBe("postgres");
      expect(postgresHealthIndicator.check).toHaveBeenCalled();
    });
  });
});
