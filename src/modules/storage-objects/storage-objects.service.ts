import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PinoLoggerService } from "../../common/logger/pino-logger.service.js";
import { serializeJsonResponse } from "../../common/metadata/json-response.js";
import { buildPaginatedResult } from "../../common/metadata/pagination.js";
import { throwConflictForDuplicateRecord } from "../../common/metadata/prisma-errors.js";
import { toPrismaNullableJson } from "../../common/metadata/prisma-json.js";
import { buildOrderBy } from "../../common/metadata/sorting.js";
import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../database/prisma.service.js";
import type {
  CreateStorageObjectInput,
  ListStorageObjectsQuery,
  UpdateStorageObjectInput,
} from "./dto/storage-objects.dto.js";

type StorageObjectWhereInput = Prisma.StorageObjectWhereInput;

/**
 * Manage object storage metadata records.
 */
@Injectable()
export class StorageObjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLoggerService
  ) {}

  /**
   * Create storage object metadata without storing binary content.
   * @param data - Create request data.
   * @returns The created storage object.
   */
  async create(
    data: CreateStorageObjectInput
  ): Promise<Record<string, unknown>> {
    await this.ensureChecksumIsAvailable(data.tenantId, data.checksumSha256);

    try {
      const storageObject = await this.prisma.storageObject.create({
        data: {
          tenantId: data.tenantId,
          organizationId: data.organizationId,
          projectId: data.projectId,
          provider: data.provider,
          bucket: data.bucket,
          objectKey: data.objectKey,
          region: data.region,
          endpoint: data.endpoint,
          versionId: data.versionId,
          originalName: data.originalName,
          mimeType: data.mimeType,
          extension: data.extension,
          sizeBytes: data.sizeBytes,
          checksumSha256: data.checksumSha256,
          etag: data.etag,
          metadata: toPrismaNullableJson(data.metadata),
        },
      });

      this.logger.info({
        event: "storage_object.created",
        tenantId: storageObject.tenantId,
        storageObjectId: storageObject.id,
      });

      return serializeJsonResponse(storageObject) as Record<string, unknown>;
    } catch (error) {
      throwConflictForDuplicateRecord(
        error,
        "A storage object with the same provider, bucket, and object key already exists for this tenant."
      );
    }
  }

  /**
   * List tenant-scoped storage objects.
   * @param query - List query.
   * @returns Paginated storage objects.
   */
  async list(query: ListStorageObjectsQuery) {
    const where = this.buildListWhere(query);
    const [items, total] = await Promise.all([
      this.prisma.storageObject.findMany({
        where,
        orderBy: buildOrderBy(query),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.storageObject.count({ where }),
    ]);

    return buildPaginatedResult(
      items.map((item) => serializeJsonResponse(item)),
      query,
      total
    );
  }

  /**
   * Get one tenant-scoped storage object.
   * @param id - Storage object ID.
   * @param tenantId - Tenant ID.
   * @returns The matching storage object.
   */
  async getById(
    id: string,
    tenantId: string
  ): Promise<Record<string, unknown>> {
    const storageObject = await this.prisma.storageObject.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!storageObject) {
      throw new NotFoundException("Storage object was not found.");
    }

    return serializeJsonResponse(storageObject) as Record<string, unknown>;
  }

  /**
   * Update tenant-scoped storage object metadata.
   * @param id - Storage object ID.
   * @param tenantId - Tenant ID.
   * @param data - Update request data.
   * @returns The updated storage object.
   */
  async update(
    id: string,
    tenantId: string,
    data: UpdateStorageObjectInput
  ): Promise<Record<string, unknown>> {
    const existingStorageObject = await this.ensureStorageObjectExists(
      id,
      tenantId
    );

    if (
      data.checksumSha256 &&
      data.checksumSha256 !== existingStorageObject.checksumSha256
    ) {
      await this.ensureChecksumIsAvailable(tenantId, data.checksumSha256, id);
    }

    try {
      const storageObject = await this.prisma.storageObject.update({
        where: { id },
        data: {
          provider: data.provider,
          bucket: data.bucket,
          objectKey: data.objectKey,
          region: data.region,
          endpoint: data.endpoint,
          versionId: data.versionId,
          originalName: data.originalName,
          mimeType: data.mimeType,
          extension: data.extension,
          sizeBytes: data.sizeBytes,
          checksumSha256: data.checksumSha256,
          etag: data.etag,
          metadata: toPrismaNullableJson(data.metadata),
        },
      });

      this.logger.info({
        event: "storage_object.updated",
        tenantId,
        storageObjectId: id,
      });

      return serializeJsonResponse(storageObject) as Record<string, unknown>;
    } catch (error) {
      throwConflictForDuplicateRecord(
        error,
        "A storage object with the same provider, bucket, and object key already exists for this tenant."
      );
    }
  }

  /**
   * Soft-delete a tenant-scoped storage object.
   * @param id - Storage object ID.
   * @param tenantId - Tenant ID.
   */
  async delete(id: string, tenantId: string): Promise<void> {
    await this.ensureStorageObjectExists(id, tenantId);
    await this.prisma.storageObject.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.info({
      event: "storage_object.deleted",
      tenantId,
      storageObjectId: id,
    });
  }

  /**
   * Ensure a storage object exists for the requested tenant.
   * @param id - Storage object ID.
   * @param tenantId - Tenant ID.
   * @returns The matching storage object identity fields.
   */
  private async ensureStorageObjectExists(id: string, tenantId: string) {
    const storageObject = await this.prisma.storageObject.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        checksumSha256: true,
      },
    });

    if (!storageObject) {
      throw new NotFoundException("Storage object was not found.");
    }

    return storageObject;
  }

  /**
   * Ensure no active storage object already uses the checksum in this tenant.
   * @param tenantId - Tenant ID.
   * @param checksumSha256 - SHA-256 checksum.
   * @param exceptId - Optional storage object ID to exclude.
   */
  private async ensureChecksumIsAvailable(
    tenantId: string,
    checksumSha256: string,
    exceptId?: string
  ): Promise<void> {
    const duplicateStorageObject = await this.prisma.storageObject.findFirst({
      where: {
        tenantId,
        checksumSha256,
        deletedAt: null,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: {
        id: true,
      },
    });

    if (duplicateStorageObject) {
      throw new ConflictException(
        "A storage object with the same checksum already exists for this tenant."
      );
    }
  }

  /**
   * Build the Prisma filter for storage object list queries.
   * @param query - List query.
   * @returns Prisma storage object where input.
   */
  private buildListWhere(
    query: ListStorageObjectsQuery
  ): StorageObjectWhereInput {
    const searchWhere: StorageObjectWhereInput | undefined = query.search
      ? {
          OR: [
            { originalName: { contains: query.search, mode: "insensitive" } },
            { objectKey: { contains: query.search, mode: "insensitive" } },
            { bucket: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : undefined;

    return {
      tenantId: query.tenantId,
      organizationId: query.organizationId,
      projectId: query.projectId,
      provider: query.provider,
      checksumSha256: query.checksumSha256,
      mimeType: query.mimeType,
      deletedAt: null,
      ...(searchWhere ? searchWhere : {}),
    };
  }
}
