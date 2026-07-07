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

  it("should delegate retry to the service with tenant query", async () => {
    const service = {
      retryJob: jest
        .fn<(...args: any[]) => Promise<{ id: string; status: string }>>()
        .mockResolvedValue({ id: "job-1", status: "QUEUED" }),
    };
    const controller = new IngestionController(service as never);

    const result = await controller.retryJob(
      { id: "4e946c9e-ea1e-48d4-aa8e-7f3e4a29c41d" },
      { tenantId: "tenant_acme" }
    );

    expect(result).toEqual({ id: "job-1", status: "QUEUED" });
    expect(service.retryJob).toHaveBeenCalledWith(
      "4e946c9e-ea1e-48d4-aa8e-7f3e4a29c41d",
      { tenantId: "tenant_acme" }
    );
  });

  it("should delegate cancellation to the service with tenant query", async () => {
    const service = {
      cancelJob: jest
        .fn<(...args: any[]) => Promise<{ id: string; status: string }>>()
        .mockResolvedValue({ id: "job-1", status: "CANCELLED" }),
    };
    const controller = new IngestionController(service as never);

    const result = await controller.cancelJob(
      { id: "4e946c9e-ea1e-48d4-aa8e-7f3e4a29c41d" },
      { tenantId: "tenant_acme" }
    );

    expect(result).toEqual({ id: "job-1", status: "CANCELLED" });
    expect(service.cancelJob).toHaveBeenCalledWith(
      "4e946c9e-ea1e-48d4-aa8e-7f3e4a29c41d",
      { tenantId: "tenant_acme" }
    );
  });
});
