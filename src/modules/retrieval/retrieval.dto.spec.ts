import { describe, expect, it } from "@jest/globals";
import { retrievalQuerySchema } from "./dto/retrieval-query.dto.js";

const tenantId = "tenant_acme";
const knowledgeBaseId = "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4";

describe("retrieval DTO validation", () => {
  it("should reject an empty query", () => {
    expect(() =>
      retrievalQuerySchema.parse({
        tenantId,
        knowledgeBaseId,
        query: "   ",
      })
    ).toThrow();
  });

  it("should reject a missing tenant ID", () => {
    expect(() =>
      retrievalQuerySchema.parse({
        knowledgeBaseId,
        query: "How do I upload documents?",
      })
    ).toThrow();
  });

  it("should reject a missing knowledge base ID", () => {
    expect(() =>
      retrievalQuerySchema.parse({
        tenantId,
        query: "How do I upload documents?",
      })
    ).toThrow();
  });

  it("should reject ambiguous singular and plural filters", () => {
    expect(() =>
      retrievalQuerySchema.parse({
        tenantId,
        knowledgeBaseId,
        query: "How do I upload documents?",
        filters: {
          sourceId: "adf1ed11-f72e-4af4-9a1b-9d6d9941d30e",
          sourceIds: ["adf1ed11-f72e-4af4-9a1b-9d6d9941d30e"],
        },
      })
    ).toThrow();
  });
});
