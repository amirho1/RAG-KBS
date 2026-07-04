import { HttpStatus } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { jest } from "@jest/globals";
import type { Response } from "express";
import { HealthController } from "./health.controller.js";
import { HealthService } from "./health.service.js";

describe("HealthController", () => {
  let healthController: HealthController;
  let healthService: {
    getLiveness: jest.Mock<HealthService["getLiveness"]>;
    checkReadiness: jest.Mock<HealthService["checkReadiness"]>;
    getOverallHealth: jest.Mock<HealthService["getOverallHealth"]>;
    checkDependency: jest.Mock<HealthService["checkDependency"]>;
  };
  let response: { status: jest.Mock<(code: number) => Response> };

  beforeEach(async () => {
    healthService = {
      getLiveness: jest.fn<HealthService["getLiveness"]>(),
      checkReadiness: jest.fn<HealthService["checkReadiness"]>(),
      getOverallHealth: jest.fn<HealthService["getOverallHealth"]>(),
      checkDependency: jest.fn<HealthService["checkDependency"]>(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: healthService,
        },
      ],
    }).compile();

    healthController = moduleRef.get(HealthController);
    const status = jest.fn<(code: number) => Response>();
    response = {
      status,
    };
    status.mockReturnValue(response as unknown as Response);
  });

  it("should return live status with HTTP 200", () => {
    healthService.getLiveness.mockReturnValue({
      status: "ok",
      service: "rag-kbs-api",
      timestamp: "2026-07-04T00:00:00.000Z",
      uptimeSeconds: 10,
    });

    const result = healthController.getLive();

    expect(result.status).toBe("ok");
    expect(healthService.getLiveness).toHaveBeenCalled();
  });

  it("should return readiness with HTTP 200 when healthy", async () => {
    healthService.checkReadiness.mockResolvedValue({
      status: "ok",
      dependencies: {},
      timestamp: "2026-07-04T00:00:00.000Z",
    });

    const result = await healthController.getReady(
      response as unknown as Response
    );

    expect(result.status).toBe("ok");
    expect(response.status).toHaveBeenCalledWith(HttpStatus.OK);
  });

  it("should return readiness with HTTP 503 when unhealthy", async () => {
    healthService.checkReadiness.mockResolvedValue({
      status: "error",
      dependencies: {
        postgres: {
          status: "error",
          dependency: "postgres",
          message: "PostgreSQL health check failed",
          timestamp: "2026-07-04T00:00:00.000Z",
        },
      },
      timestamp: "2026-07-04T00:00:00.000Z",
    });

    const result = await healthController.getReady(
      response as unknown as Response
    );

    expect(result.status).toBe("error");
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.SERVICE_UNAVAILABLE
    );
    expect(JSON.stringify(result)).not.toContain("postgresql://");
  });

  it("should return dependency failure with HTTP 503", async () => {
    healthService.checkDependency.mockResolvedValue({
      status: "error",
      dependency: "redis",
      message: "Redis health check failed",
      timestamp: "2026-07-04T00:00:00.000Z",
    });

    const result = await healthController.getRedisHealth(
      response as unknown as Response
    );

    expect(result.message).toBe("Redis health check failed");
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.SERVICE_UNAVAILABLE
    );
    expect(JSON.stringify(result)).not.toContain("redis://");
  });
});
