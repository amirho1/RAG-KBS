import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
import { LifecycleStatus } from "../../generated/prisma/enums.js";
import { PinoLoggerService } from "../../common/logger/pino-logger.service.js";
import { buildPaginatedResult } from "../../common/metadata/pagination.js";
import { serializeJsonResponse } from "../../common/metadata/json-response.js";
import {
  normalizeSlug,
  normalizeTagName,
} from "../../common/metadata/name-normalization.js";
import { throwConflictForDuplicateRecord } from "../../common/metadata/prisma-errors.js";
import { toPrismaNullableJson } from "../../common/metadata/prisma-json.js";
import { buildOrderBy } from "../../common/metadata/sorting.js";
import { PrismaService } from "../database/prisma.service.js";
import type {
  CreateSourceInput,
  ListSourcesQuery,
  UpdateSourceInput,
} from "./dto/sources.dto.js";

type SourceWhereInput = Prisma.SourceWhereInput;

/**
 * Manage source metadata records.
 */
@Injectable()
export class SourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLoggerService
  ) {}

  /**
   * Create a source inside a tenant-scoped knowledge base.
   * @param data - Create request data.
   * @returns The created source.
   */
  async create(data: CreateSourceInput): Promise<Record<string, unknown>> {
    await this.ensureKnowledgeBaseExists(data.knowledgeBaseId, data.tenantId);

    if (data.parentSourceId) {
      await this.ensureParentSourceExists(
        data.parentSourceId,
        data.tenantId,
        data.knowledgeBaseId
      );
    }

    try {
      const source = await this.prisma.source.create({
        data: {
          tenantId: data.tenantId,
          organizationId: data.organizationId,
          projectId: data.projectId,
          knowledgeBaseId: data.knowledgeBaseId,
          parentSourceId: data.parentSourceId,
          externalId: data.externalId,
          name: data.name,
          slug: normalizeSlug(data.slug ?? data.name),
          description: data.description,
          type: data.type,
          syncMode: data.syncMode,
          status: data.status,
          processingState: data.processingState,
          uri: data.uri,
          checksumSha256: data.checksumSha256,
          contentHash: data.contentHash,
          metadata: toPrismaNullableJson(data.metadata),
        },
        include: this.getSourceInclude(),
      });

      this.logger.info({
        event: "source.created",
        tenantId: source.tenantId,
        sourceId: source.id,
        knowledgeBaseId: source.knowledgeBaseId,
      });

      return this.serializeSource(source);
    } catch (error) {
      throwConflictForDuplicateRecord(
        error,
        "A source with the same name, slug, or external ID already exists in this knowledge base."
      );
    }
  }

  /**
   * List tenant-scoped sources.
   * @param query - List query.
   * @returns Paginated sources.
   */
  async list(query: ListSourcesQuery) {
    const where = this.buildListWhere(query);
    const [items, total] = await Promise.all([
      this.prisma.source.findMany({
        where,
        include: this.getSourceInclude(),
        orderBy: buildOrderBy(query),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.source.count({ where }),
    ]);

    return buildPaginatedResult(
      items.map((item) => this.serializeSource(item)),
      query,
      total
    );
  }

  /**
   * Get one tenant-scoped source.
   * @param id - Source ID.
   * @param tenantId - Tenant ID.
   * @returns The matching source.
   */
  async getById(
    id: string,
    tenantId: string
  ): Promise<Record<string, unknown>> {
    const source = await this.prisma.source.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: this.getSourceInclude(),
    });

    if (!source) {
      throw new NotFoundException("Source was not found.");
    }

    return this.serializeSource(source);
  }

  /**
   * Update a tenant-scoped source.
   * @param id - Source ID.
   * @param tenantId - Tenant ID.
   * @param data - Update request data.
   * @returns The updated source.
   */
  async update(
    id: string,
    tenantId: string,
    data: UpdateSourceInput
  ): Promise<Record<string, unknown>> {
    const existingSource = await this.ensureSourceExists(id, tenantId);

    if (data.parentSourceId) {
      await this.ensureParentSourceExists(
        data.parentSourceId,
        tenantId,
        existingSource.knowledgeBaseId
      );
    }

    try {
      const source = await this.prisma.source.update({
        where: { id },
        data: {
          parentSourceId: data.parentSourceId,
          externalId: data.externalId,
          name: data.name,
          slug: data.slug ? normalizeSlug(data.slug) : undefined,
          description: data.description,
          type: data.type,
          syncMode: data.syncMode,
          status: data.status,
          processingState: data.processingState,
          uri: data.uri,
          checksumSha256: data.checksumSha256,
          contentHash: data.contentHash,
          metadata: toPrismaNullableJson(data.metadata),
        },
        include: this.getSourceInclude(),
      });

      this.logger.info({
        event: "source.updated",
        tenantId,
        sourceId: id,
        knowledgeBaseId: source.knowledgeBaseId,
      });

      return this.serializeSource(source);
    } catch (error) {
      throwConflictForDuplicateRecord(
        error,
        "A source with the same name, slug, or external ID already exists in this knowledge base."
      );
    }
  }

  /**
   * Soft-delete a tenant-scoped source.
   * @param id - Source ID.
   * @param tenantId - Tenant ID.
   */
  async delete(id: string, tenantId: string): Promise<void> {
    const source = await this.ensureSourceExists(id, tenantId);
    await this.prisma.source.update({
      where: { id },
      data: {
        status: LifecycleStatus.DELETED,
        deletedAt: new Date(),
      },
    });

    this.logger.info({
      event: "source.deleted",
      tenantId,
      sourceId: id,
      knowledgeBaseId: source.knowledgeBaseId,
    });
  }

  /**
   * Ensure the source's knowledge base exists for the same tenant.
   * @param knowledgeBaseId - Knowledge base ID.
   * @param tenantId - Tenant ID.
   */
  private async ensureKnowledgeBaseExists(
    knowledgeBaseId: string,
    tenantId: string
  ): Promise<void> {
    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: {
        id: knowledgeBaseId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!knowledgeBase) {
      throw new NotFoundException("Knowledge base was not found.");
    }
  }

  /**
   * Ensure a parent source belongs to the same tenant and knowledge base.
   * @param parentSourceId - Parent source ID.
   * @param tenantId - Tenant ID.
   * @param knowledgeBaseId - Knowledge base ID.
   */
  private async ensureParentSourceExists(
    parentSourceId: string,
    tenantId: string,
    knowledgeBaseId: string
  ): Promise<void> {
    const parentSource = await this.prisma.source.findFirst({
      where: {
        id: parentSourceId,
        tenantId,
        knowledgeBaseId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!parentSource) {
      throw new NotFoundException("Parent source was not found.");
    }
  }

  /**
   * Ensure a source exists for the requested tenant.
   * @param id - Source ID.
   * @param tenantId - Tenant ID.
   * @returns The matching source identity fields.
   */
  private async ensureSourceExists(id: string, tenantId: string) {
    const source = await this.prisma.source.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        knowledgeBaseId: true,
      },
    });

    if (!source) {
      throw new NotFoundException("Source was not found.");
    }

    return source;
  }

  /**
   * Build the Prisma filter for source list queries.
   * @param query - List query.
   * @returns Prisma source where input.
   */
  private buildListWhere(query: ListSourcesQuery): SourceWhereInput {
    const andFilters: SourceWhereInput[] = [];

    if (query.search) {
      andFilters.push({
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { slug: { contains: query.search, mode: "insensitive" } },
          { description: { contains: query.search, mode: "insensitive" } },
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
      type: query.type,
      status: query.status,
      processingState: query.processingState,
      deletedAt: null,
      ...(andFilters.length > 0 ? { AND: andFilters } : {}),
    };
  }

  /**
   * Build the Prisma include used to return source tag summaries.
   * @returns Prisma source include.
   */
  private getSourceInclude() {
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
   * Serialize a source and flatten tag assignments into tag summaries.
   * @param source - Prisma source with tag relations.
   * @returns JSON-safe source response.
   */
  private serializeSource(source: unknown): Record<string, unknown> {
    const serializedSource = serializeJsonResponse(source) as Record<
      string,
      unknown
    >;
    const tagAssignments = Array.isArray(serializedSource.tags)
      ? serializedSource.tags
      : [];

    return {
      ...serializedSource,
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
