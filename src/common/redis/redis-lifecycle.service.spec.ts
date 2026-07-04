import { Test, TestingModule } from "@nestjs/testing";
import { jest } from "@jest/globals";
import { REDIS_CLIENT } from "./redis.constants.js";
import { RedisLifecycleService } from "./redis-lifecycle.service.js";

type RedisClientMock = {
  status: string;
  quit: jest.Mock<() => Promise<"OK">>;
  disconnect: jest.Mock<() => void>;
};

describe("RedisLifecycleService", () => {
  let redisClient: RedisClientMock;
  let redisLifecycleService: RedisLifecycleService;

  beforeEach(async () => {
    redisClient = {
      status: "ready",
      quit: jest.fn<() => Promise<"OK">>().mockResolvedValue("OK"),
      disconnect: jest.fn<() => void>(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        RedisLifecycleService,
        {
          provide: REDIS_CLIENT,
          useValue: redisClient,
        },
      ],
    }).compile();

    redisLifecycleService = moduleRef.get(RedisLifecycleService);
  });

  it("should quit and disconnect an active Redis client", async () => {
    await redisLifecycleService.onModuleDestroy();

    expect(redisClient.quit).toHaveBeenCalled();
    expect(redisClient.disconnect).toHaveBeenCalled();
  });

  it("should skip shutdown when the Redis client is already ended", async () => {
    redisClient.status = "end";

    await redisLifecycleService.onModuleDestroy();

    expect(redisClient.quit).not.toHaveBeenCalled();
    expect(redisClient.disconnect).not.toHaveBeenCalled();
  });
});
