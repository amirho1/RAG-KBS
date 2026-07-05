import { Logger } from "@nestjs/common";
import { jest } from "@jest/globals";
import { StorageService } from "../../storage/storage.service.js";
import type { StorageHealthResult } from "../../storage/interfaces/stored-object.interface.js";
import { StorageHealthIndicator } from "./storage.health-indicator.js";

type StorageServiceMock = {
  healthCheck: jest.MockedFunction<() => Promise<StorageHealthResult>>;
};

/**
 * Create a storage service mock for health indicator tests.
 * @returns Storage service mock.
 */
function createStorageServiceMock(): StorageServiceMock {
  return {
    healthCheck: jest.fn<() => Promise<StorageHealthResult>>(),
  };
}

/**
 * Create a storage health indicator with mocked dependencies.
 * @param storageService - Storage service mock.
 * @returns Storage health indicator.
 */
function createStorageHealthIndicator(
  storageService: StorageServiceMock
): StorageHealthIndicator {
  return new StorageHealthIndicator(
    storageService as unknown as StorageService,
    {
      postgresTimeoutMs: 2000,
      redisTimeoutMs: 2000,
      qdrantTimeoutMs: 3000,
      storageTimeoutMs: 3000,
      queueTimeoutMs: 2000,
    }
  );
}

describe("StorageHealthIndicator", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return ok when the storage service health check is ok", async () => {
    const storageService = createStorageServiceMock();
    jest.mocked(storageService.healthCheck).mockResolvedValue({
      status: "ok",
      latencyMs: 2,
    });
    const indicator = createStorageHealthIndicator(storageService);

    const result = await indicator.check();

    expect(result.status).toBe("ok");
    expect(result.dependency).toBe("storage");
  });

  it("should return a safe error when the storage service health check fails", async () => {
    const loggerSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    const storageService = createStorageServiceMock();
    jest.mocked(storageService.healthCheck).mockResolvedValue({
      status: "error",
      latencyMs: 2,
      message: "connect ECONNREFUSED http://minio:9000 secret",
    });
    const indicator = createStorageHealthIndicator(storageService);

    const result = await indicator.check();
    const loggedPayload = JSON.stringify(loggerSpy.mock.calls);

    expect(result.status).toBe("error");
    expect(result.message).toBe("Storage health check failed");
    expect(loggedPayload).toContain("Storage health check failed");
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
