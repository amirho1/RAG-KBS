import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { jest } from "@jest/globals";
import healthConfig from "../../../config/health.config.js";
import { PrismaService } from "../../database/prisma.service.js";
import { PostgresHealthIndicator } from "./postgres.health-indicator.js";

describe("PostgresHealthIndicator", () => {
  let postgresHealthIndicator: PostgresHealthIndicator;
  let prismaService: { $queryRaw: jest.Mock<() => Promise<unknown>> };

  beforeEach(async () => {
    prismaService = {
      $queryRaw: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresHealthIndicator,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: healthConfig.KEY,
          useValue: {
            postgresTimeoutMs: 2000,
            redisTimeoutMs: 2000,
            qdrantTimeoutMs: 3000,
            storageTimeoutMs: 3000,
            queueTimeoutMs: 2000,
          },
        },
      ],
    }).compile();

    postgresHealthIndicator = moduleRef.get(PostgresHealthIndicator);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return ok when SELECT 1 succeeds", async () => {
    prismaService.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const result = await postgresHealthIndicator.check();

    expect(result.status).toBe("ok");
    expect(result.dependency).toBe("postgres");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("should return error when the query fails", async () => {
    const loggerSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);

    prismaService.$queryRaw.mockRejectedValue(
      new Error(
        "Invalid `prisma.$queryRaw()` invocation:\n\n\nRaw query failed. Code: `N/A`. Message: `Can't reach database server at `postgres:5432`"
      )
    );

    const result = await postgresHealthIndicator.check();
    const loggedPayload = JSON.stringify(loggerSpy.mock.calls);

    expect(result.status).toBe("error");
    expect(result.message).toBe("PostgreSQL health check failed");
    expect(loggedPayload).toContain("PostgreSQL health check failed");
    expect(loggedPayload).not.toContain("$queryRaw");
    expect(loggedPayload).not.toContain("Raw query failed");
    expect(loggedPayload).not.toContain("Can't reach database server");
    expect(JSON.stringify(result)).not.toContain("postgresql://");
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
