import { Logger } from "@nestjs/common";
import { jest } from "@jest/globals";
import { PrismaService } from "./prisma.service.js";

type PoolOwner = {
  pool: {
    end: () => Promise<void>;
  };
};

const databaseUrl = "postgresql://rag_kbs:secret@localhost:5432/rag_kbs_test";

/**
 * Create a Prisma service for lifecycle tests.
 * @returns The Prisma service.
 */
function createPrismaService(): PrismaService {
  return new PrismaService({ url: databaseUrl });
}

/**
 * Get the private PostgreSQL pool for focused lifecycle assertions.
 * @param prismaService - The Prisma service.
 * @returns The PostgreSQL connection pool.
 */
function getPool(prismaService: PrismaService): PoolOwner["pool"] {
  return (prismaService as unknown as PoolOwner).pool;
}

describe("PrismaService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should connect when the module initializes", async () => {
    const prismaService = createPrismaService();
    const connectSpy = jest
      .spyOn(prismaService, "$connect")
      .mockResolvedValue(undefined);

    await prismaService.onModuleInit();

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it("should disconnect Prisma and close the PostgreSQL pool", async () => {
    const prismaService = createPrismaService();
    const disconnectSpy = jest
      .spyOn(prismaService, "$disconnect")
      .mockResolvedValue(undefined);
    const poolEndSpy = jest
      .spyOn(getPool(prismaService), "end")
      .mockResolvedValue(undefined);

    await prismaService.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(poolEndSpy).toHaveBeenCalledTimes(1);
  });

  it("should log sanitized connection errors", async () => {
    const prismaService = createPrismaService();
    const loggerSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);

    jest
      .spyOn(prismaService, "$connect")
      .mockRejectedValue(new Error(`Unable to connect to ${databaseUrl}`));

    await expect(prismaService.onModuleInit()).rejects.toThrow(
      "Unable to connect"
    );

    const loggedPayload = JSON.stringify(loggerSpy.mock.calls);

    expect(loggedPayload).toContain("Failed to connect to PostgreSQL.");
    expect(loggedPayload).not.toContain(databaseUrl);
    expect(loggedPayload).not.toContain("secret");
  });

  it("should close the pool and log safely when Prisma disconnect fails", async () => {
    const prismaService = createPrismaService();
    const loggerSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    const poolEndSpy = jest
      .spyOn(getPool(prismaService), "end")
      .mockResolvedValue(undefined);

    jest
      .spyOn(prismaService, "$disconnect")
      .mockRejectedValue(new Error(`Failed to disconnect ${databaseUrl}`));

    await expect(prismaService.onModuleDestroy()).rejects.toThrow(
      "Failed to disconnect"
    );

    const loggedPayload = JSON.stringify(loggerSpy.mock.calls);

    expect(poolEndSpy).toHaveBeenCalledTimes(1);
    expect(loggedPayload).toContain("Failed to disconnect Prisma client.");
    expect(loggedPayload).not.toContain(databaseUrl);
    expect(loggedPayload).not.toContain("secret");
  });
});
