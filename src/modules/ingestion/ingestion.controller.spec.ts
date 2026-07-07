import { describe, expect, it, jest } from "@jest/globals";
import { IngestionController } from "./ingestion.controller.js";

describe("IngestionController", () => {
  it("should delegate file ingestion creation to the service", async () => {
    const service = {
      createFileIngestionJob: jest
        .fn<(...args: any[]) => Promise<{ id: string }>>()
        .mockResolvedValue({ id: "job-1" }),
    };
    const controller = new IngestionController(service as never);

    const result = await controller.createFileIngestionJob(
      { id: "113d5fe3-927e-428d-9b55-557a6f776ed9" },
      {
        tenantId: "tenant_acme",
        force: false,
        reason: "INITIAL_INGESTION",
      }
    );

    expect(result).toEqual({ id: "job-1" });
    expect(service.createFileIngestionJob).toHaveBeenCalledWith(
      "113d5fe3-927e-428d-9b55-557a6f776ed9",
      {
        tenantId: "tenant_acme",
        force: false,
        reason: "INITIAL_INGESTION",
      }
    );
  });
});
