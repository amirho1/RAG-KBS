import { describe, expect, it, jest } from "@jest/globals";
import { RetrievalResultService } from "./services/retrieval-result.service.js";

describe("RetrievalResultService", () => {
  it("should skip persistence when result storage is disabled", async () => {
    const prisma = {
      retrievalResult: {
        createMany: jest.fn<(...args: any[]) => Promise<unknown>>(),
      },
    };
    const service = new RetrievalResultService(prisma as never);

    await service.storeResults(
      "6db3b2e6-b677-40a6-9a29-383793cf2f25",
      "tenant_acme",
      [
        {
          rank: 1,
          score: 0.8,
          chunkId: "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b",
          sourceId: "adf1ed11-f72e-4af4-9a1b-9d6d9941d30e",
          fileId: "113d5fe3-927e-428d-9b55-557a6f776ed9",
          textPreview: "Preview",
          persistedPayload: {},
        },
      ],
      false
    );

    expect(prisma.retrievalResult.createMany).not.toHaveBeenCalled();
  });

  it("should persist result rows when enabled", async () => {
    const prisma = {
      retrievalResult: {
        createMany: jest.fn<(...args: any[]) => Promise<unknown>>(() =>
          Promise.resolve({ count: 1 })
        ),
      },
    };
    const service = new RetrievalResultService(prisma as never);

    await service.storeResults(
      "6db3b2e6-b677-40a6-9a29-383793cf2f25",
      "tenant_acme",
      [
        {
          rank: 1,
          score: 0.8,
          chunkId: "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b",
          sourceId: "adf1ed11-f72e-4af4-9a1b-9d6d9941d30e",
          fileId: "113d5fe3-927e-428d-9b55-557a6f776ed9",
          textPreview: "Preview",
          metadata: {
            title: "Upload Guide",
          },
          persistedPayload: {
            textPreview: "Preview",
          },
        },
      ],
      true
    );

    expect(prisma.retrievalResult.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          tenantId: "tenant_acme",
          rank: 1,
          score: 0.8,
          vectorScore: 0.8,
          textPreview: "Preview",
        }),
      ],
    });
  });
});
