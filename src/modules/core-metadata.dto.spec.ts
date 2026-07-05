import {
  createFileSchema,
  listFilesQuerySchema,
} from "./files/dto/files.dto.js";
import { createKnowledgeBaseSchema } from "./knowledge-bases/dto/knowledge-bases.dto.js";
import { createSourceSchema } from "./sources/dto/sources.dto.js";
import { createStorageObjectSchema } from "./storage-objects/dto/storage-objects.dto.js";

const validChecksum =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("core metadata DTO schemas", () => {
  it("should reject unknown fields", () => {
    const result = createKnowledgeBaseSchema.safeParse({
      tenantId: "tenant_acme",
      name: "Docs",
      unknownField: "nope",
    });

    expect(result.success).toBe(false);
  });

  it("should validate source enum values", () => {
    const result = createSourceSchema.safeParse({
      tenantId: "tenant_acme",
      knowledgeBaseId: "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4",
      name: "Docs",
      type: "NOT_A_SOURCE_TYPE",
    });

    expect(result.success).toBe(false);
  });

  it("should validate checksum and MIME type fields", () => {
    const result = createFileSchema.safeParse({
      tenantId: "tenant_acme",
      sourceId: "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4",
      storageObjectId: "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b",
      originalName: "openapi.yaml",
      mimeType: "not-a-mime-type",
      sizeBytes: "2048",
      checksumSha256: "bad-checksum",
    });

    expect(result.success).toBe(false);
  });

  it("should transform file size strings into BigInt values", () => {
    const result = createStorageObjectSchema.parse({
      tenantId: "tenant_acme",
      provider: "S3",
      objectKey: "tenant_acme/openapi.yaml",
      sizeBytes: "2048",
      checksumSha256: validChecksum,
    });

    expect(result.sizeBytes).toBe(2048n);
  });

  it("should parse pagination and tag filters from query strings", () => {
    const result = listFilesQuerySchema.parse({
      tenantId: "tenant_acme",
      page: "2",
      limit: "10",
      tagIds:
        "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4,6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b",
      tagNames: "API Docs,Policies",
    });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.tagIds).toEqual([
      "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4",
      "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b",
    ]);
    expect(result.tagNames).toEqual(["API Docs", "Policies"]);
  });
});
