import { describe, expect, it } from "@jest/globals";
import { IngestionJobType } from "../../../generated/prisma/enums.js";
import { IngestionIdempotencyService } from "./ingestion-idempotency.service.js";

describe("IngestionIdempotencyService", () => {
  it("should generate stable keys for equivalent inputs", () => {
    const service = new IngestionIdempotencyService();
    const input = {
      tenantId: "tenant_acme",
      fileId: "113d5fe3-927e-428d-9b55-557a6f776ed9",
      checksumSha256:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      jobType: IngestionJobType.INGEST_FILE,
      parserVersion: "1.0.0",
      force: false,
    };

    expect(service.generateKey(input)).toBe(service.generateKey(input));
  });

  it("should generate different keys when force changes", () => {
    const service = new IngestionIdempotencyService();
    const input = {
      tenantId: "tenant_acme",
      fileId: "113d5fe3-927e-428d-9b55-557a6f776ed9",
      checksumSha256:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      jobType: IngestionJobType.REINGEST_FILE,
      parserVersion: "1.0.0",
      force: false,
    };

    expect(service.generateKey(input)).not.toBe(
      service.generateKey({ ...input, force: true })
    );
  });
});
