import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
import { FileStatus } from "../../generated/prisma/enums.js";
import { PinoLoggerService } from "../../common/logger/pino-logger.service.js";
import { buildPaginatedResult } from "../../common/metadata/pagination.js";
import { serializeJsonResponse } from "../../common/metadata/json-response.js";
import { normalizeTagName } from "../../common/metadata/name-normalization.js";
import { throwConflictForDuplicateRecord } from "../../common/metadata/prisma-errors.js";
import { toPrismaNullableJson } from "../../common/metadata/prisma-json.js";
import { buildOrderBy } from "../../common/metadata/sorting.js";
import { PrismaService } from "../database/prisma.service.js";
import type {
  CreateFileInput,
  ListFilesQuery,
  UpdateFileInput,
} from "./dto/files.dto.js";

type DocumentFileWhereInput = Prisma.DocumentFileWhereInput;

/**
 * Manage document file metadata records.
 */
@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLoggerService
  ) {}

  /**
   * Create document file metadata linked to a source and storage object.
   * @param data - Create request data.
   * @returns The created document file.
   */
  async create(data: CreateFileInput): Promise<Record<string, unknown>> {
    const source = await this.ensureSourceExists(data.sourceId, data.tenantId);
    await this.ensureStorageObjectExists(data.storageObjectId, data.tenantId);

    if (data.previousFileId) {
      await this.ensurePreviousFileExists(
        data.previousFileId,
        data.tenantId,
        data.sourceId
      );
    }

    await this.ensureChecksumIsAvailable(
      data.tenantId,
      data.sourceId,
      data.checksumSha256
    );

    try {
      const file = await this.prisma.documentFile.create({
        data: {
          tenantId: data.tenantId,
          organizationId: data.organizationId ?? source.organizationId,
          projectId: data.projectId ?? source.projectId,
          knowledgeBaseId: source.knowledgeBaseId,
          sourceId: data.sourceId,
          storageObjectId: data.storageObjectId,
          previousFileId: data.previousFileId,
          externalId: data.externalId,
          originalName: data.originalName,
          normalizedName: data.normalizedName,
          logicalPath: data.logicalPath,
          mimeType: data.mimeType,
          extension: data.extension,
          fileType: data.fileType,
          sizeBytes: data.sizeBytes,
          checksumSha256: data.checksumSha256,
          contentHash: data.contentHash,
          version: data.version,
          status: data.status,
          processingState: data.processingState,
          title: data.title,
          description: data.description,
          language: data.language,
          metadata: toPrismaNullableJson(data.metadata),
        },
        include: this.getFileInclude(),
      });

      this.logger.info({
        event: "file.created",
        tenantId: file.tenantId,
        knowledgeBaseId: file.knowledgeBaseId,
        sourceId: file.sourceId,
        fileId: file.id,
      });

      return this.serializeFile(file);
    } catch (error) {
      throwConflictForDuplicateRecord(
        error,
        "A file with the same checksum or external ID already exists in this source."
      );
    }
  }

  /**
   * List tenant-scoped document files.
   * @param query - List query.
   * @returns Paginated document files.
   */
  async list(query: ListFilesQuery) {
    const where = this.buildListWhere(query);
    const [items, total] = await Promise.all([
      this.prisma.documentFile.findMany({
        where,
        include: this.getFileInclude(),
        orderBy: buildOrderBy(query),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.documentFile.count({ where }),
    ]);

    return buildPaginatedResult(
      items.map((item) => this.serializeFile(item)),
      query,
      total
    );
  }

  /**
   * Get one tenant-scoped document file.
   * @param id - File ID.
   * @param tenantId - Tenant ID.
   * @returns The matching document file.
   */
  async getById(
    id: string,
    tenantId: string
  ): Promise<Record<string, unknown>> {
    const file = await this.prisma.documentFile.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: this.getFileInclude(),
    });

    if (!file) {
      throw new NotFoundException("File was not found.");
    }

    return this.serializeFile(file);
  }

  /**
   * Update tenant-scoped document file metadata.
   * @param id - File ID.
   * @param tenantId - Tenant ID.
   * @param data - Update request data.
   * @returns The updated document file.
   */
  async update(
    id: string,
    tenantId: string,
    data: UpdateFileInput
  ): Promise<Record<string, unknown>> {
    const existingFile = await this.ensureFileExists(id, tenantId);

    if (data.storageObjectId) {
      await this.ensureStorageObjectExists(data.storageObjectId, tenantId);
    }

    if (data.previousFileId) {
      await this.ensurePreviousFileExists(
        data.previousFileId,
        tenantId,
        existingFile.sourceId
      );
    }

    if (
      data.checksumSha256 &&
      data.checksumSha256 !== existingFile.checksumSha256
    ) {
      await this.ensureChecksumIsAvailable(
        tenantId,
        existingFile.sourceId,
        data.checksumSha256,
        id
      );
    }

    try {
      const file = await this.prisma.documentFile.update({
        where: { id },
        data: {
          storageObjectId: data.storageObjectId,
          previousFileId: data.previousFileId,
          externalId: data.externalId,
          originalName: data.originalName,
          normalizedName: data.normalizedName,
          logicalPath: data.logicalPath,
          mimeType: data.mimeType,
          extension: data.extension,
          fileType: data.fileType,
          sizeBytes: data.sizeBytes,
          checksumSha256: data.checksumSha256,
          contentHash: data.contentHash,
          version: data.version,
          status: data.status,
          processingState: data.processingState,
          title: data.title,
          description: data.description,
          language: data.language,
          metadata: toPrismaNullableJson(data.metadata),
        },
        include: this.getFileInclude(),
      });

      this.logger.info({
        event: "file.updated",
        tenantId,
        knowledgeBaseId: file.knowledgeBaseId,
        sourceId: file.sourceId,
        fileId: id,
      });

      return this.serializeFile(file);
    } catch (error) {
      throwConflictForDuplicateRecord(
        error,
        "A file with the same checksum or external ID already exists in this source."
      );
    }
  }

  /**
   * Soft-delete a tenant-scoped document file.
   * @param id - File ID.
   * @param tenantId - Tenant ID.
   */
  async delete(id: string, tenantId: string): Promise<void> {
    const file = await this.ensureFileExists(id, tenantId);
    await this.prisma.documentFile.update({
      where: { id },
      data: {
        status: FileStatus.DELETED,
        deletedAt: new Date(),
      },
    });

    this.logger.info({
      event: "file.deleted",
      tenantId,
      knowledgeBaseId: file.knowledgeBaseId,
      sourceId: file.sourceId,
      fileId: id,
    });
  }

  /**
   * Ensure a source belongs to the requested tenant.
   * @param sourceId - Source ID.
   * @param tenantId - Tenant ID.
   * @returns Source identity fields.
   */
  private async ensureSourceExists(sourceId: string, tenantId: string) {
    const source = await this.prisma.source.findFirst({
      where: {
        id: sourceId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        knowledgeBaseId: true,
        organizationId: true,
        projectId: true,
      },
    });

    if (!source) {
      throw new NotFoundException("Source was not found.");
    }

    return source;
  }

  /**
   * Ensure a storage object belongs to the requested tenant.
   * @param storageObjectId - Storage object ID.
   * @param tenantId - Tenant ID.
   */
  private async ensureStorageObjectExists(
    storageObjectId: string,
    tenantId: string
  ): Promise<void> {
    const storageObject = await this.prisma.storageObject.findFirst({
      where: {
        id: storageObjectId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!storageObject) {
      throw new NotFoundException("Storage object was not found.");
    }
  }

  /**
   * Ensure a previous file belongs to the same tenant and source.
   * @param previousFileId - Previous file ID.
   * @param tenantId - Tenant ID.
   * @param sourceId - Source ID.
   */
  private async ensurePreviousFileExists(
    previousFileId: string,
    tenantId: string,
    sourceId: string
  ): Promise<void> {
    const previousFile = await this.prisma.documentFile.findFirst({
      where: {
        id: previousFileId,
        tenantId,
        sourceId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!previousFile) {
      throw new NotFoundException("Previous file was not found.");
    }
  }

  /**
   * Ensure a file exists for the requested tenant.
   * @param id - File ID.
   * @param tenantId - Tenant ID.
   * @returns File identity fields.
   */
  private async ensureFileExists(id: string, tenantId: string) {
    const file = await this.prisma.documentFile.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        knowledgeBaseId: true,
        sourceId: true,
        checksumSha256: true,
      },
    });

    if (!file) {
      throw new NotFoundException("File was not found.");
    }

    return file;
  }

  /**
   * Ensure no active file in the source already uses the checksum.
   * @param tenantId - Tenant ID.
   * @param sourceId - Source ID.
   * @param checksumSha256 - SHA-256 checksum.
   * @param exceptId - Optional file ID to exclude.
   */
  private async ensureChecksumIsAvailable(
    tenantId: string,
    sourceId: string,
    checksumSha256: string,
    exceptId?: string
  ): Promise<void> {
    const duplicateFile = await this.prisma.documentFile.findFirst({
      where: {
        tenantId,
        sourceId,
        checksumSha256,
        deletedAt: null,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: {
        id: true,
      },
    });

    if (duplicateFile) {
      throw new ConflictException(
        "A file with the same checksum already exists in this source."
      );
    }
  }

  /**
   * Build the Prisma filter for file list queries.
   * @param query - List query.
   * @returns Prisma file where input.
   */
  private buildListWhere(query: ListFilesQuery): DocumentFileWhereInput {
    const andFilters: DocumentFileWhereInput[] = [];

    if (query.search) {
      andFilters.push({
        OR: [
          { originalName: { contains: query.search, mode: "insensitive" } },
          { normalizedName: { contains: query.search, mode: "insensitive" } },
          { title: { contains: query.search, mode: "insensitive" } },
          { logicalPath: { contains: query.search, mode: "insensitive" } },
        ],
      });
    }

    if (query.tagIds) {
      andFilters.push({
        tags: {
          some: {
            tagId: { in: query.tagIds },
            tag: { deletedAt: null },
          },
        },
      });
    }

    if (query.tagNames) {
      andFilters.push({
        tags: {
          some: {
            tag: {
              normalizedName: {
                in: query.tagNames.map((tagName) => normalizeTagName(tagName)),
              },
              deletedAt: null,
            },
          },
        },
      });
    }

    return {
      tenantId: query.tenantId,
      organizationId: query.organizationId,
      projectId: query.projectId,
      knowledgeBaseId: query.knowledgeBaseId,
      sourceId: query.sourceId,
      storageObjectId: query.storageObjectId,
      status: query.status,
      processingState: query.processingState,
      fileType: query.fileType,
      mimeType: query.mimeType,
      checksumSha256: query.checksumSha256,
      deletedAt: null,
      ...(andFilters.length > 0 ? { AND: andFilters } : {}),
    };
  }

  /**
   * Build the Prisma include used to return file tag summaries.
   * @returns Prisma file include.
   */
  private getFileInclude() {
    return {
      tags: {
        where: {
          tag: {
            deletedAt: null,
          },
        },
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              normalizedName: true,
              color: true,
            },
          },
        },
      },
    };
  }

  /**
   * Serialize a file and flatten tag assignments into tag summaries.
   * @param file - Prisma document file with tag relations.
   * @returns JSON-safe file response.
   */
  private serializeFile(file: unknown): Record<string, unknown> {
    const serializedFile = serializeJsonResponse(file) as Record<
      string,
      unknown
    >;
    const tagAssignments = Array.isArray(serializedFile.tags)
      ? serializedFile.tags
      : [];

    return {
      ...serializedFile,
      tags: tagAssignments
        .map((assignment) =>
          assignment && typeof assignment === "object" && "tag" in assignment
            ? (assignment as { tag: unknown }).tag
            : undefined
        )
        .filter((tag): tag is Record<string, unknown> => Boolean(tag)),
    };
  }
}
