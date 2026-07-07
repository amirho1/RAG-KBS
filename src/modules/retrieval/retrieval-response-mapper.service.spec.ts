import { describe, expect, it } from "@jest/globals";
import { RetrievalResponseMapperService } from "./services/retrieval-response-mapper.service.js";

const payload = {
  tenantId: "tenant_acme",
  knowledgeBaseId: "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4",
  sourceId: "adf1ed11-f72e-4af4-9a1b-9d6d9941d30e",
  fileId: "113d5fe3-927e-428d-9b55-557a6f776ed9",
  chunkId: "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b",
  chunkEmbeddingId: "4e946c9e-ea1e-48d4-aa8e-7f3e4a29c41d",
  qdrantCollectionId: "9cf2e930-6d58-483f-a975-8f9477770b70",
  text: "To upload a document, send a multipart request.",
  textPreview: "To upload a document...",
  title: "Upload Guide",
  tags: ["api-docs"],
  mimeType: "text/markdown",
  chunkIndex: 4,
  headingPath: ["Files", "Upload"],
  vector: [1, 2, 3],
};

describe("RetrievalResponseMapperService", () => {
  it("should map Qdrant payloads to retrieval responses", () => {
    const service = new RetrievalResponseMapperService();
    const results = service.mapSearchResults({
      results: [{ id: "point-1", score: 0.82, payload }],
      includeText: true,
      includeMetadata: true,
    });

    expect(results[0]).toMatchObject({
      rank: 1,
      score: 0.82,
      chunkId: payload.chunkId,
      sourceId: payload.sourceId,
      fileId: payload.fileId,
      text: payload.text,
      textPreview: payload.textPreview,
      metadata: {
        title: "Upload Guide",
        tags: ["api-docs"],
        mimeType: "text/markdown",
        chunkIndex: 4,
        headingPath: ["Files", "Upload"],
      },
    });
    expect(results[0].metadata).not.toHaveProperty("vector");
    expect(results[0].persistedPayload).not.toHaveProperty("text");
    expect(results[0].persistedPayload).not.toHaveProperty("vector");
  });

  it("should respect includeText=false", () => {
    const service = new RetrievalResponseMapperService();
    const results = service.mapSearchResults({
      results: [{ id: "point-1", score: 0.82, payload }],
      includeText: false,
      includeMetadata: true,
    });

    expect(results[0]).not.toHaveProperty("text");
    expect(results[0].textPreview).toBe(payload.textPreview);
  });

  it("should respect includeMetadata=false", () => {
    const service = new RetrievalResponseMapperService();
    const results = service.mapSearchResults({
      results: [{ id: "point-1", score: 0.82, payload }],
      includeText: true,
      includeMetadata: false,
    });

    expect(results[0]).not.toHaveProperty("metadata");
  });
});
