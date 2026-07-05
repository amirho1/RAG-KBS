import { jest } from "@jest/globals";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Readable } from "node:stream";
import { PinoLoggerService } from "../../common/logger/pino-logger.service.js";
import { RequestContextService } from "../../common/request-context/request-context.service.js";
import { PrismaService } from "../database/prisma.service.js";
import {
  uploadFileSchema,
  type UploadFileInput,
} from "./dto/upload-file.dto.js";
import type {
  PutObjectInput,
  StorageDriver,
} from "./interfaces/storage-driver.interface.js";
import type { StoredObject } from "./interfaces/stored-object.interface.js";
import type { UploadedFile } from "./interfaces/uploaded-file.interface.js";
import { bytesPerMegabyte } from "./storage.constants.js";
import { StorageService } from "./storage.service.js";

const tenantId = "tenant_acme";
const otherTenantId = "tenant_other";
const knowledgeBaseId = "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4";
const sourceId = "adf1ed11-f72e-4af4-9a1b-9d6d9941d30e";
const storageObjectId = "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b";
const fileId = "113d5fe3-927e-428d-9b55-557a6f776ed9";
const checksumSha256 =
  "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";

type MockFn = ReturnType<typeof jest.fn>;
type DelegateMock = Record<string, MockFn>;
type PrismaMock = {
  source: DelegateMock;
  storageObject: DelegateMock;
  documentFile: DelegateMock;
};

type StorageDriverMock = StorageDriver & {
  putObject: MockFn;
  getObject: MockFn;
  deleteObject: MockFn;
  exists: MockFn;
  healthCheck: MockFn;
};

type ServiceHarness = {
  service: StorageService;
  prisma: PrismaMock;
  storageDriver: StorageDriverMock;
};

/**
 * Create a Prisma delegate mock.
 * @returns Delegate mock.
 */
function createDelegateMock(): DelegateMock {
  return {
    create: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
}

/**
 * Create a Prisma mock for storage service tests.
 * @returns Prisma mock.
 */
function createPrismaMock(): PrismaMock {
  return {
    source: createDelegateMock(),
    storageObject: createDelegateMock(),
    documentFile: createDelegateMock(),
  };
}

/**
 * Create a storage driver mock.
 * @returns Storage driver mock.
 */
function createStorageDriverMock(): StorageDriverMock {
  return {
    putObject: jest.fn(),
    getObject: jest.fn(),
    deleteObject: jest.fn(),
    exists: jest.fn(),
    healthCheck: jest.fn(),
  };
}

/**
 * Create a logger mock.
 * @returns Logger mock.
 */
function createLoggerMock(): Pick<PinoLoggerService, "info" | "errorPayload"> {
  return {
    info: jest.fn(),
    errorPayload: jest.fn(),
  };
}

/**
 * Create a request context mock.
 * @returns Request context mock.
 */
function createRequestContextMock(): Pick<
  RequestContextService,
  "getRequestId"
> {
  return {
    getRequestId: jest.fn(() => "req_test"),
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
 * Create a storage service with mocked dependencies.
 * @param maxUploadSizeMb - Upload size limit.
 * @returns Service test harness.
 */
function createStorageService(maxUploadSizeMb = 1): ServiceHarness {
  const prisma = createPrismaMock();
  const storageDriver = createStorageDriverMock();
  const service = new StorageService(
    prisma as unknown as PrismaService,
    createLoggerMock() as PinoLoggerService,
    createRequestContextMock() as RequestContextService,
    storageDriver,
    {
      driver: "local",
      localPath: "/tmp/rag-kbs-test-storage",
      s3: {
        endpoint: "",
        region: "",
        bucket: "",
        accessKeyId: "",
        secretAccessKey: "",
        forcePathStyle: false,
      },
      allowedUploadMimeTypes: ["text/plain", "application/pdf"],
    },
    {
      queueName: "ingestion",
      concurrency: 2,
      maxUploadSizeMb,
    }
  );

  return {
    service,
    prisma,
    storageDriver,
  };
}

/**
 * Create valid upload request data.
 * @returns Upload input.
 */
function createUploadInput(): UploadFileInput {
  return {
    tenantId,
    sourceId,
    title: "Manual",
    metadata: {
      category: "docs",
    },
  };
}

/**
 * Create an uploaded file mock.
 * @param body - File body.
 * @param mimeType - MIME type.
 * @returns Uploaded file.
 */
function createUploadedFile(
  body = Buffer.from("hello", "utf8"),
  mimeType = "text/plain"
): UploadedFile {
  return {
    originalname: "../../manual.txt",
    mimetype: mimeType,
    size: body.length,
    buffer: body,
  };
}

describe("StorageService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should upload a new file and create storage and document metadata", async () => {
    const { service, prisma, storageDriver } = createStorageService();
    prisma.source.findFirst.mockResolvedValue({
      id: sourceId,
      knowledgeBaseId,
      organizationId: null,
      projectId: null,
    });
    prisma.documentFile.findFirst.mockResolvedValue(null);
    prisma.storageObject.findFirst.mockResolvedValue(null);
    storageDriver.putObject.mockImplementation((input: PutObjectInput) => {
      return Promise.resolve({
        provider: "LOCAL",
        objectKey: input.objectKey,
        sizeBytes: input.sizeBytes,
        checksumSha256: input.checksumSha256,
        etag: input.checksumSha256,
      } satisfies StoredObject);
    });
    prisma.storageObject.create.mockResolvedValue({
      id: storageObjectId,
      tenantId,
      provider: "LOCAL",
      objectKey: "tenants/tenant/file.txt",
      sizeBytes: 5n,
      checksumSha256,
    });
    prisma.documentFile.create.mockResolvedValue({
      id: fileId,
      tenantId,
      sourceId,
      storageObjectId,
      originalName: "manual.txt",
      sizeBytes: 5n,
      checksumSha256,
    });

    const result = await service.uploadFile(
      createUploadInput(),
      createUploadedFile()
    );

    expect(storageDriver.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        body: Buffer.from("hello", "utf8"),
        checksumSha256,
        contentType: "text/plain",
      })
    );
    expect(prisma.storageObject.create).toHaveBeenCalledWith(
      expectObjectContaining({
        data: expectObjectContaining({
          tenantId,
          originalName: "manual.txt",
          mimeType: "text/plain",
          extension: "txt",
          checksumSha256,
        }),
      })
    );
    expect(prisma.documentFile.create).toHaveBeenCalledWith(
      expectObjectContaining({
        data: expectObjectContaining({
          tenantId,
          knowledgeBaseId,
          sourceId,
          storageObjectId,
          status: "STORED",
        }),
      })
    );
    expect(result).toMatchObject({
      storageObject: {
        id: storageObjectId,
        sizeBytes: "5",
      },
      file: {
        id: fileId,
        sizeBytes: "5",
      },
    });
  });

  it("should reuse an existing tenant storage object by checksum", async () => {
    const { service, prisma, storageDriver } = createStorageService();
    prisma.source.findFirst.mockResolvedValue({
      id: sourceId,
      knowledgeBaseId,
      organizationId: null,
      projectId: null,
    });
    prisma.documentFile.findFirst.mockResolvedValue(null);
    prisma.storageObject.findFirst.mockResolvedValue({
      id: storageObjectId,
      tenantId,
      provider: "LOCAL",
      objectKey: "tenants/tenant/reused.txt",
      sizeBytes: 5n,
      checksumSha256,
    });
    prisma.documentFile.create.mockResolvedValue({
      id: fileId,
      tenantId,
      sourceId,
      storageObjectId,
      originalName: "manual.txt",
      sizeBytes: 5n,
      checksumSha256,
    });

    await service.uploadFile(createUploadInput(), createUploadedFile());

    expect(storageDriver.putObject).not.toHaveBeenCalled();
    expect(prisma.documentFile.create).toHaveBeenCalledWith(
      expectObjectContaining({
        data: expectObjectContaining({
          storageObjectId,
        }),
      })
    );
  });

  it("should reject duplicate file checksums in the same source", async () => {
    const { service, prisma, storageDriver } = createStorageService();
    prisma.source.findFirst.mockResolvedValue({
      id: sourceId,
      knowledgeBaseId,
      organizationId: null,
      projectId: null,
    });
    prisma.documentFile.findFirst.mockResolvedValue({ id: fileId });

    await expect(
      service.uploadFile(createUploadInput(), createUploadedFile())
    ).rejects.toBeInstanceOf(ConflictException);
    expect(storageDriver.putObject).not.toHaveBeenCalled();
  });

  it("should reject invalid MIME types", async () => {
    const { service } = createStorageService();

    await expect(
      service.uploadFile(
        createUploadInput(),
        createUploadedFile(
          Buffer.from("hello", "utf8"),
          "application/x-msdownload"
        )
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should reject oversized files", async () => {
    const { service } = createStorageService(1);
    const body = Buffer.alloc(bytesPerMegabyte + 1);

    await expect(
      service.uploadFile(createUploadInput(), createUploadedFile(body))
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should reject invalid metadata JSON in the upload DTO", () => {
    const result = uploadFileSchema.safeParse({
      tenantId,
      sourceId,
      metadata: "{",
    });

    expect(result.success).toBe(false);
  });

  it("should prevent cross-tenant storage object reads", async () => {
    const { service, prisma, storageDriver } = createStorageService();
    prisma.storageObject.findFirst.mockResolvedValue(null);

    await expect(
      service.getFileStream(storageObjectId, otherTenantId)
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storageDriver.getObject).not.toHaveBeenCalled();
  });

  it("should return buffers for parsers that need buffered bytes", async () => {
    const { service, prisma, storageDriver } = createStorageService();
    prisma.storageObject.findFirst.mockResolvedValue({
      id: storageObjectId,
      tenantId,
      provider: "LOCAL",
      bucket: null,
      objectKey: "tenants/tenant/file.txt",
    });
    storageDriver.getObject.mockResolvedValue(
      Readable.from(Buffer.from("parser bytes", "utf8"))
    );

    const buffer = await service.getFileBuffer(storageObjectId, tenantId);

    expect(buffer).toEqual(Buffer.from("parser bytes", "utf8"));
  });

  it("should return false when storage object metadata is missing", async () => {
    const { service, prisma, storageDriver } = createStorageService();
    prisma.storageObject.findFirst.mockResolvedValue(null);

    await expect(
      service.storageObjectExists(storageObjectId, tenantId)
    ).resolves.toBe(false);
    expect(storageDriver.exists).not.toHaveBeenCalled();
  });

  it("should block physical deletion while active files reference the object", async () => {
    const { service, prisma, storageDriver } = createStorageService();
    prisma.storageObject.findFirst.mockResolvedValue({
      id: storageObjectId,
      tenantId,
      provider: "LOCAL",
      bucket: null,
      objectKey: "tenants/tenant/file.txt",
    });
    prisma.documentFile.count.mockResolvedValue(1);

    await expect(
      service.deleteStoredObject(storageObjectId, tenantId)
    ).rejects.toBeInstanceOf(ConflictException);
    expect(storageDriver.deleteObject).not.toHaveBeenCalled();
  });

  it("should physically delete unreferenced storage objects and soft-delete metadata", async () => {
    const { service, prisma, storageDriver } = createStorageService();
    prisma.storageObject.findFirst.mockResolvedValue({
      id: storageObjectId,
      tenantId,
      provider: "LOCAL",
      bucket: null,
      objectKey: "tenants/tenant/file.txt",
    });
    prisma.documentFile.count.mockResolvedValue(0);
    storageDriver.deleteObject.mockResolvedValue(undefined);
    prisma.storageObject.update.mockResolvedValue({
      id: storageObjectId,
      deletedAt: new Date(),
    });

    await service.deleteStoredObject(storageObjectId, tenantId);

    expect(storageDriver.deleteObject).toHaveBeenCalledWith({
      objectKey: "tenants/tenant/file.txt",
      bucket: undefined,
    });
    expect(prisma.storageObject.update).toHaveBeenCalledWith(
      expectObjectContaining({
        where: { id: storageObjectId },
        data: expectObjectContaining({
          deletedAt: expectAnyDate(),
        }),
      })
    );
  });
});
