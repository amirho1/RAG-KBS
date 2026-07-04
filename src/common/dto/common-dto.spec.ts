import { idParamSchema } from "./id-param.dto.js";
import { metadataSchema } from "./metadata.dto.js";
import { paginationQuerySchema } from "./pagination-query.dto.js";
import { createSortQuerySchema } from "./sort-query.dto.js";
import { tenantQuerySchema } from "./tenant-query.dto.js";

describe("common DTO helpers", () => {
  it("should coerce and default pagination values", () => {
    const result = paginationQuerySchema.parse({
      page: "2",
    });

    expect(result).toEqual({
      page: 2,
      limit: 20,
    });
  });

  it("should reject unknown pagination fields", () => {
    const result = paginationQuerySchema.safeParse({
      page: "1",
      extra: "nope",
    });

    expect(result.success).toBe(false);
  });

  it("should validate UUID id params", () => {
    expect(
      idParamSchema.safeParse({
        id: "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4",
      }).success
    ).toBe(true);
    expect(idParamSchema.safeParse({ id: "not-a-uuid" }).success).toBe(false);
  });

  it("should validate JSON-compatible metadata", () => {
    const result = metadataSchema.safeParse({
      source: "manual",
      nested: {
        page: 1,
        tags: ["rag", "docs"],
      },
    });

    expect(result.success).toBe(true);
  });

  it("should reject unsupported sort fields", () => {
    const sortSchema = createSortQuerySchema(["name", "createdAt"]);

    expect(sortSchema.safeParse({ sortBy: "name" }).success).toBe(true);
    expect(sortSchema.safeParse({ sortBy: "password" }).success).toBe(false);
  });

  it("should require tenant IDs for tenant-aware queries", () => {
    expect(tenantQuerySchema.safeParse({ tenantId: "tenant_1" }).success).toBe(
      true
    );
    expect(
      tenantQuerySchema.safeParse({ projectId: "project_1" }).success
    ).toBe(false);
  });
});
