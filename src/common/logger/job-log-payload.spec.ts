import type { Job } from "bullmq";
import { buildJobLogPayload } from "./job-log-payload.js";

describe("job log payload", () => {
  it("should include only whitelisted job data and safe errors", () => {
    const payload = buildJobLogPayload(
      createJobFixture(),
      "failed",
      { durationMs: 25 },
      new Error("provider failed with password=secret")
    );

    expect(payload).toMatchObject({
      event: "job.failed",
      jobId: "job-1",
      queueName: "ingestion",
      jobName: "ingest-file",
      attempt: 2,
      maxAttempts: 3,
      status: "failed",
      durationMs: 25,
      tenantId: "tenant_1",
      knowledgeBaseId: "kb_1",
      sourceId: "source_1",
      fileId: "file_1",
      ingestionJobId: "ingestion_1",
    });

    const serializedPayload = JSON.stringify(payload);
    expect(serializedPayload).not.toContain("super-secret");
    expect(serializedPayload).not.toContain("raw chunk text");
    expect(serializedPayload).not.toContain("0.123");
    expect(serializedPayload).not.toContain("password=secret");
  });
});

/**
 * Create a BullMQ job fixture.
 * @returns BullMQ job fixture.
 */
function createJobFixture() {
  return {
    id: "job-1",
    queueName: "ingestion",
    name: "ingest-file",
    attemptsMade: 2,
    opts: {
      attempts: 3,
    },
    data: {
      tenantId: "tenant_1",
      knowledgeBaseId: "kb_1",
      sourceId: "source_1",
      fileId: "file_1",
      ingestionJobId: "ingestion_1",
      apiKey: "super-secret",
      rawText: "raw chunk text",
      embeddings: [0.123, 0.456],
    },
  } as unknown as Pick<
    Job<Record<string, unknown>>,
    "id" | "name" | "data" | "attemptsMade" | "opts"
  > & {
    queueName: string;
  };
}
