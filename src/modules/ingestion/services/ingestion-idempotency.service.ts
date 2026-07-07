import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { IngestionJobType } from "../../../generated/prisma/enums.js";

export type IngestionIdempotencyInput = {
  tenantId: string;
  fileId: string;
  checksumSha256: string;
  jobType: IngestionJobType;
  parserVersion: string;
  force: boolean;
};

/**
 * Generates deterministic idempotency keys for ingestion jobs.
 */
@Injectable()
export class IngestionIdempotencyService {
  /**
   * Generate a deterministic ingestion idempotency key.
   * @param input - Idempotency input.
   * @returns Stable idempotency key.
   */
  generateKey(input: IngestionIdempotencyInput): string {
    const hash = createHash("sha256")
      .update(
        JSON.stringify({
          tenantId: input.tenantId,
          fileId: input.fileId,
          checksumSha256: input.checksumSha256,
          jobType: input.jobType,
          parserVersion: input.parserVersion,
          force: input.force,
        }),
        "utf8"
      )
      .digest("hex");

    return `ingestion:${hash}`;
  }
}
