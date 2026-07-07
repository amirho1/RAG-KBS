import { describe, expect, it } from "@jest/globals";
import { RetrievalFilterService } from "./services/retrieval-filter.service.js";

const tenantId = "tenant_acme";
const knowledgeBaseId = "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4";
const sourceId = "adf1ed11-f72e-4af4-9a1b-9d6d9941d30e";
const fileId = "113d5fe3-927e-428d-9b55-557a6f776ed9";

describe("RetrievalFilterService", () => {
  it("should build required tenant and knowledge base filters", () => {
    const service = new RetrievalFilterService();
    const filters = service.normalizeFilters(undefined);
    const qdrantFilter = service.buildPayloadFilter({
      tenantId,
      knowledgeBaseId,
      filters,
      tagFilterValues: [],
    });

    expect(qdrantFilter.must).toEqual([
      { key: "tenantId", match: { value: tenantId } },
      { key: "knowledgeBaseId", match: { value: knowledgeBaseId } },
    ]);
  });

  it("should build source ID filters", () => {
    const service = new RetrievalFilterService();
    const filters = service.normalizeFilters({ sourceIds: [sourceId] });
    const qdrantFilter = service.buildPayloadFilter({
      tenantId,
      knowledgeBaseId,
      filters,
      tagFilterValues: [],
    });

    expect(qdrantFilter.must).toContainEqual({
      key: "sourceId",
      match: { any: [sourceId] },
    });
  });

  it("should build file ID filters", () => {
    const service = new RetrievalFilterService();
    const filters = service.normalizeFilters({ fileIds: [fileId] });
    const qdrantFilter = service.buildPayloadFilter({
      tenantId,
      knowledgeBaseId,
      filters,
      tagFilterValues: [],
    });

    expect(qdrantFilter.must).toContainEqual({
      key: "fileId",
      match: { any: [fileId] },
    });
  });

  it("should normalize tags and build tag filters", () => {
    const service = new RetrievalFilterService();
    const filters = service.normalizeFilters({ tags: [" API Docs "] });
    const qdrantFilter = service.buildPayloadFilter({
      tenantId,
      knowledgeBaseId,
      filters,
      tagFilterValues: ["api docs", "API Docs"],
    });

    expect(filters.tags).toEqual(["api docs"]);
    expect(qdrantFilter.must).toContainEqual({
      key: "tags",
      match: { any: ["api docs", "API Docs"] },
    });
  });

  it("should build MIME type and language filters", () => {
    const service = new RetrievalFilterService();
    const filters = service.normalizeFilters({
      mimeTypes: ["text/markdown"],
      language: "en",
    });
    const qdrantFilter = service.buildPayloadFilter({
      tenantId,
      knowledgeBaseId,
      filters,
      tagFilterValues: [],
    });

    expect(qdrantFilter.must).toContainEqual({
      key: "mimeType",
      match: { any: ["text/markdown"] },
    });
    expect(qdrantFilter.must).toContainEqual({
      key: "language",
      match: { value: "en" },
    });
  });
});
