import { ConflictException, NotFoundException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { PinoLoggerService } from "../common/logger/pino-logger.service.js";
import { PrismaService } from "./database/prisma.service.js";
import { FilesService } from "./files/files.service.js";
import { KnowledgeBasesService } from "./knowledge-bases/knowledge-bases.service.js";
import { SourcesService } from "./sources/sources.service.js";
import { StorageObjectsService } from "./storage-objects/storage-objects.service.js";
import { TagsService } from "./tags/tags.service.js";

const tenantId = "tenant_acme";
const otherTenantId = "tenant_other";
const knowledgeBaseId = "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4";
const sourceId = "adf1ed11-f72e-4af4-9a1b-9d6d9941d30e";
const storageObjectId = "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b";
const fileId = "113d5fe3-927e-428d-9b55-557a6f776ed9";
const tagId = "a03ef734-ae8a-442b-982d-68a37c1f6ec2";
const checksumSha256 =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

type MockFn = ReturnType<typeof jest.fn>;
type DelegateMock = Record<string, MockFn>;
type PrismaMock = {
  knowledgeBase: DelegateMock;
  source: DelegateMock;
  storageObject: DelegateMock;
  documentFile: DelegateMock;
  tag: DelegateMock;
  sourceTag: DelegateMock;
  fileTag: DelegateMock;
};

/**
 * Create a mock delegate with common Prisma methods.
 * @returns Mock Prisma delegate.
 */
function createDelegateMock(): DelegateMock {
  return {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
  };
}

/**
 * Create a Prisma service mock for metadata services.
 * @returns Mock Prisma service.
 */
function createPrismaMock(): PrismaMock {
  return {
    knowledgeBase: createDelegateMock(),
    source: createDelegateMock(),
    storageObject: createDelegateMock(),
    documentFile: createDelegateMock(),
    tag: createDelegateMock(),
    sourceTag: createDelegateMock(),
    fileTag: createDelegateMock(),
  };
}

/**
 * Create a logger mock for service tests.
 * @returns Mock logger service.
 */
function createLoggerMock(): Pick<PinoLoggerService, "info"> {
  return {
    info: jest.fn(),
  };
}

/**
 * Create a typed Jest objectContaining matcher.
 * @param value - Expected object shape.
 * @returns Typed asymmetric matcher.
 */
function expectObjectContaining<T extends Record<string, unknown>>(
  value: T
): T {
  return expect.objectContaining(value) as T;
}

/**
 * Create a typed Jest Date matcher.
 * @returns Typed asymmetric Date matcher.
 */
function expectAnyDate(): Date {
  return expect.any(Date) as Date;
}

/**
 * Create a knowledge base service with mocked dependencies.
 * @param prisma - Prisma mock.
 * @returns Knowledge bases service.
 */
function createKnowledgeBasesService(
  prisma: PrismaMock
): KnowledgeBasesService {
  return new KnowledgeBasesService(
    prisma as unknown as PrismaService,
    createLoggerMock() as PinoLoggerService
  );
}

/**
 * Create a sources service with mocked dependencies.
 * @param prisma - Prisma mock.
 * @returns Sources service.
 */
function createSourcesService(prisma: PrismaMock): SourcesService {
  return new SourcesService(
    prisma as unknown as PrismaService,
    createLoggerMock() as PinoLoggerService
  );
}

/**
 * Create a storage objects service with mocked dependencies.
 * @param prisma - Prisma mock.
 * @returns Storage objects service.
 */
function createStorageObjectsService(
  prisma: PrismaMock
): StorageObjectsService {
  return new StorageObjectsService(
    prisma as unknown as PrismaService,
    createLoggerMock() as PinoLoggerService
  );
}

/**
 * Create a files service with mocked dependencies.
 * @param prisma - Prisma mock.
 * @returns Files service.
 */
function createFilesService(prisma: PrismaMock): FilesService {
  return new FilesService(
    prisma as unknown as PrismaService,
    createLoggerMock() as PinoLoggerService
  );
}

/**
 * Create a tags service with mocked dependencies.
 * @param prisma - Prisma mock.
 * @returns Tags service.
 */
function createTagsService(prisma: PrismaMock): TagsService {
  return new TagsService(
    prisma as unknown as PrismaService,
    createLoggerMock() as PinoLoggerService
  );
}

describe("core metadata services", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("KnowledgeBasesService", () => {
    it("should create a knowledge base with a normalized slug", async () => {
      const prisma = createPrismaMock();
      const service = createKnowledgeBasesService(prisma);
      prisma.knowledgeBase.create.mockResolvedValue({
        id: knowledgeBaseId,
        tenantId,
        name: "API Documentation",
        slug: "api-documentation",
      });

      const result = await service.create({
        tenantId,
        name: "API Documentation",
      });

      expect(prisma.knowledgeBase.create).toHaveBeenCalledWith(
        expectObjectContaining({
          data: expectObjectContaining({
            tenantId,
            slug: "api-documentation",
          }),
        })
      );
      expect(result).toMatchObject({
        id: knowledgeBaseId,
        slug: "api-documentation",
      });
    });

    it("should list knowledge bases by tenant and exclude soft-deleted records", async () => {
      const prisma = createPrismaMock();
      const service = createKnowledgeBasesService(prisma);
      prisma.knowledgeBase.findMany.mockResolvedValue([
        {
          id: knowledgeBaseId,
          tenantId,
          name: "Docs",
          slug: "docs",
        },
      ]);
      prisma.knowledgeBase.count.mockResolvedValue(1);

      const result = await service.list({
        tenantId,
        page: 1,
        limit: 20,
        sortDirection: "asc",
      });

      expect(prisma.knowledgeBase.findMany).toHaveBeenCalledWith(
        expectObjectContaining({
          where: expectObjectContaining({
            tenantId,
            deletedAt: null,
          }),
        })
      );
      expect(result.pagination.total).toBe(1);
    });

    it("should prevent cross-tenant reads", async () => {
      const prisma = createPrismaMock();
      const service = createKnowledgeBasesService(prisma);
      prisma.knowledgeBase.findFirst.mockResolvedValue(null);

      await expect(
        service.getById(knowledgeBaseId, otherTenantId)
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should soft-delete knowledge bases", async () => {
      const prisma = createPrismaMock();
      const service = createKnowledgeBasesService(prisma);
      prisma.knowledgeBase.findFirst.mockResolvedValue({ id: knowledgeBaseId });
      prisma.knowledgeBase.update.mockResolvedValue({
        id: knowledgeBaseId,
        deletedAt: new Date(),
      });

      await service.delete(knowledgeBaseId, tenantId);

      expect(prisma.knowledgeBase.update).toHaveBeenCalledWith(
        expectObjectContaining({
          where: { id: knowledgeBaseId },
          data: expectObjectContaining({
            status: "DELETED",
            deletedAt: expectAnyDate(),
          }),
        })
      );
    });
  });

  describe("SourcesService", () => {
    it("should create a source inside an existing knowledge base", async () => {
      const prisma = createPrismaMock();
      const service = createSourcesService(prisma);
      prisma.knowledgeBase.findFirst.mockResolvedValue({ id: knowledgeBaseId });
      prisma.source.create.mockResolvedValue({
        id: sourceId,
        tenantId,
        knowledgeBaseId,
        name: "OpenAPI docs",
        slug: "openapi-docs",
        tags: [],
      });

      const result = await service.create({
        tenantId,
        knowledgeBaseId,
        name: "OpenAPI docs",
        type: "OPENAPI",
      });

      expect(prisma.knowledgeBase.findFirst).toHaveBeenCalledWith(
        expectObjectContaining({
          where: expectObjectContaining({
            id: knowledgeBaseId,
            tenantId,
            deletedAt: null,
          }),
        })
      );
      expect(result).toMatchObject({
        id: sourceId,
        tags: [],
      });
    });
  });

  describe("StorageObjectsService", () => {
    it("should create storage object metadata and serialize sizeBytes", async () => {
      const prisma = createPrismaMock();
      const service = createStorageObjectsService(prisma);
      prisma.storageObject.findFirst.mockResolvedValue(null);
      prisma.storageObject.create.mockResolvedValue({
        id: storageObjectId,
        tenantId,
        provider: "S3",
        objectKey: "tenant_acme/openapi.yaml",
        sizeBytes: 2048n,
        checksumSha256,
      });

      const result = await service.create({
        tenantId,
        provider: "S3",
        objectKey: "tenant_acme/openapi.yaml",
        sizeBytes: 2048n,
        checksumSha256,
      });

      expect(prisma.storageObject.create).toHaveBeenCalledWith(
        expectObjectContaining({
          data: expectObjectContaining({
            tenantId,
            checksumSha256,
          }),
        })
      );
      expect(result.sizeBytes).toBe("2048");
    });

    it("should reject duplicate active checksums per tenant", async () => {
      const prisma = createPrismaMock();
      const service = createStorageObjectsService(prisma);
      prisma.storageObject.findFirst.mockResolvedValue({ id: storageObjectId });

      await expect(
        service.create({
          tenantId,
          provider: "S3",
          objectKey: "tenant_acme/openapi.yaml",
          sizeBytes: 2048n,
          checksumSha256,
        })
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("FilesService", () => {
    it("should create a document file linked to a source and storage object", async () => {
      const prisma = createPrismaMock();
      const service = createFilesService(prisma);
      prisma.source.findFirst.mockResolvedValue({
        id: sourceId,
        knowledgeBaseId,
        organizationId: null,
        projectId: null,
      });
      prisma.storageObject.findFirst.mockResolvedValue({ id: storageObjectId });
      prisma.documentFile.findFirst.mockResolvedValue(null);
      prisma.documentFile.create.mockResolvedValue({
        id: fileId,
        tenantId,
        knowledgeBaseId,
        sourceId,
        storageObjectId,
        originalName: "openapi.yaml",
        sizeBytes: 2048n,
        checksumSha256,
        tags: [],
      });

      const result = await service.create({
        tenantId,
        sourceId,
        storageObjectId,
        originalName: "openapi.yaml",
        mimeType: "application/yaml",
        sizeBytes: 2048n,
        checksumSha256,
      });

      expect(prisma.documentFile.create).toHaveBeenCalledWith(
        expectObjectContaining({
          data: expectObjectContaining({
            tenantId,
            knowledgeBaseId,
            sourceId,
            storageObjectId,
          }),
        })
      );
      expect(result).toMatchObject({
        id: fileId,
        sizeBytes: "2048",
        tags: [],
      });
    });

    it("should reject duplicate file checksums inside the same source", async () => {
      const prisma = createPrismaMock();
      const service = createFilesService(prisma);
      prisma.source.findFirst.mockResolvedValue({
        id: sourceId,
        knowledgeBaseId,
      });
      prisma.storageObject.findFirst.mockResolvedValue({ id: storageObjectId });
      prisma.documentFile.findFirst.mockResolvedValue({ id: fileId });

      await expect(
        service.create({
          tenantId,
          sourceId,
          storageObjectId,
          originalName: "openapi.yaml",
          mimeType: "application/yaml",
          sizeBytes: 2048n,
          checksumSha256,
        })
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("TagsService", () => {
    it("should create tags with normalized names", async () => {
      const prisma = createPrismaMock();
      const service = createTagsService(prisma);
      prisma.tag.findFirst.mockResolvedValue(null);
      prisma.tag.create.mockResolvedValue({
        id: tagId,
        tenantId,
        name: "API Docs",
        normalizedName: "api docs",
      });

      const result = await service.create({
        tenantId,
        name: "API Docs",
      });

      expect(prisma.tag.create).toHaveBeenCalledWith(
        expectObjectContaining({
          data: expectObjectContaining({
            normalizedName: "api docs",
          }),
        })
      );
      expect(result.normalizedName).toBe("api docs");
    });

    it("should reject duplicate normalized tag names per tenant", async () => {
      const prisma = createPrismaMock();
      const service = createTagsService(prisma);
      prisma.tag.findFirst.mockResolvedValue({ id: tagId });

      await expect(
        service.create({
          tenantId,
          name: "API Docs",
        })
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("should attach a tag to a source", async () => {
      const prisma = createPrismaMock();
      const service = createTagsService(prisma);
      prisma.source.findFirst.mockResolvedValue({ id: sourceId });
      prisma.tag.findFirst.mockResolvedValue({ id: tagId });
      prisma.sourceTag.findUnique.mockResolvedValue(null);
      prisma.sourceTag.create.mockResolvedValue({ sourceId, tagId });

      await service.attachTagToSource(sourceId, tagId, tenantId);

      expect(prisma.sourceTag.create).toHaveBeenCalledWith({
        data: {
          sourceId,
          tagId,
        },
      });
    });

    it("should attach a tag to a file", async () => {
      const prisma = createPrismaMock();
      const service = createTagsService(prisma);
      prisma.documentFile.findFirst.mockResolvedValue({ id: fileId });
      prisma.tag.findFirst.mockResolvedValue({ id: tagId });
      prisma.fileTag.findUnique.mockResolvedValue(null);
      prisma.fileTag.create.mockResolvedValue({ fileId, tagId });

      await service.attachTagToFile(fileId, tagId, tenantId);

      expect(prisma.fileTag.create).toHaveBeenCalledWith({
        data: {
          fileId,
          tagId,
        },
      });
    });

    it("should reject duplicate source tag assignments", async () => {
      const prisma = createPrismaMock();
      const service = createTagsService(prisma);
      prisma.source.findFirst.mockResolvedValue({ id: sourceId });
      prisma.tag.findFirst.mockResolvedValue({ id: tagId });
      prisma.sourceTag.findUnique.mockResolvedValue({ sourceId, tagId });

      await expect(
        service.attachTagToSource(sourceId, tagId, tenantId)
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("should reject duplicate file tag assignments", async () => {
      const prisma = createPrismaMock();
      const service = createTagsService(prisma);
      prisma.documentFile.findFirst.mockResolvedValue({ id: fileId });
      prisma.tag.findFirst.mockResolvedValue({ id: tagId });
      prisma.fileTag.findUnique.mockResolvedValue({ fileId, tagId });

      await expect(
        service.attachTagToFile(fileId, tagId, tenantId)
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
