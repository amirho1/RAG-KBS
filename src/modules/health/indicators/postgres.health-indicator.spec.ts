import { Test, TestingModule } from "@nestjs/testing";
import { jest } from "@jest/globals";
import { PrismaService } from "../../../common/prisma/prisma.service.js";
import healthConfig from "../../../config/health.config.js";
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

  it("should return ok when SELECT 1 succeeds", async () => {
    prismaService.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const result = await postgresHealthIndicator.check();

    expect(result.status).toBe("ok");
    expect(result.dependency).toBe("postgres");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("should return error when the query fails", async () => {
    prismaService.$queryRaw.mockRejectedValue(
      new Error(
        "connect ECONNREFUSED postgresql://user:secret@localhost:5432/db"
      )
    );

    const result = await postgresHealthIndicator.check();

    expect(result.status).toBe("error");
    expect(result.message).toBe("PostgreSQL health check failed");
    expect(JSON.stringify(result)).not.toContain("postgresql://");
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
