import { Injectable, NotFoundException } from "@nestjs/common";
import { PinoLoggerService } from "../../common/logger/pino-logger.service.js";
import { serializeJsonResponse } from "../../common/metadata/json-response.js";
import { normalizeSlug } from "../../common/metadata/name-normalization.js";
import { buildPaginatedResult } from "../../common/metadata/pagination.js";
import { throwConflictForDuplicateRecord } from "../../common/metadata/prisma-errors.js";
import { toPrismaNullableJson } from "../../common/metadata/prisma-json.js";
import { buildOrderBy } from "../../common/metadata/sorting.js";
import { Prisma } from "../../generated/prisma/client.js";
import { KnowledgeBaseStatus } from "../../generated/prisma/enums.js";
import { PrismaService } from "../database/prisma.service.js";
import type {
  CreateKnowledgeBaseInput,
  ListKnowledgeBasesQuery,
  UpdateKnowledgeBaseInput,
} from "./dto/knowledge-bases.dto.js";

type KnowledgeBaseWhereInput = Prisma.KnowledgeBaseWhereInput;

/**
 * Manage knowledge base metadata records.
 */
@Injectable()
export class KnowledgeBasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLoggerService
  ) {}

  /**
   * Create a tenant-scoped knowledge base.
   * @param data - Create request data.
   * @returns The created knowledge base.
   */
  async create(
    data: CreateKnowledgeBaseInput
  ): Promise<Record<string, unknown>> {
    try {
      const knowledgeBase = await this.prisma.knowledgeBase.create({
        data: {
          tenantId: data.tenantId,
          organizationId: data.organizationId,
          projectId: data.projectId,
          externalId: data.externalId,
          name: data.name,
          slug: normalizeSlug(data.slug ?? data.name),
          description: data.description,
          status: data.status,
          metadata: toPrismaNullableJson(data.metadata),
        },
      });

      this.logger.info({
        event: "knowledge_base.created",
        tenantId: knowledgeBase.tenantId,
        knowledgeBaseId: knowledgeBase.id,
      });

      return serializeJsonResponse(knowledgeBase) as Record<string, unknown>;
    } catch (error) {
      throwConflictForDuplicateRecord(
        error,
        "A knowledge base with the same name, slug, or external ID already exists for this tenant."
      );
    }
  }

  /**
   * List tenant-scoped knowledge bases.
   * @param query - List query.
   * @returns Paginated knowledge bases.
   */
  async list(query: ListKnowledgeBasesQuery) {
    const where = this.buildListWhere(query);
    const [items, total] = await Promise.all([
      this.prisma.knowledgeBase.findMany({
        where,
        orderBy: buildOrderBy(query),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.knowledgeBase.count({ where }),
    ]);

    return buildPaginatedResult(
      items.map((item) => serializeJsonResponse(item)),
      query,
      total
    );
  }

  /**
   * Get one tenant-scoped knowledge base.
   * @param id - Knowledge base ID.
   * @param tenantId - Tenant ID.
   * @returns The matching knowledge base.
   */
  async getById(
    id: string,
    tenantId: string
  ): Promise<Record<string, unknown>> {
    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!knowledgeBase) {
      throw new NotFoundException("Knowledge base was not found.");
    }

    return serializeJsonResponse(knowledgeBase) as Record<string, unknown>;
  }

  /**
   * Update a tenant-scoped knowledge base.
   * @param id - Knowledge base ID.
   * @param tenantId - Tenant ID.
   * @param data - Update request data.
   * @returns The updated knowledge base.
   */
  async update(
    id: string,
    tenantId: string,
    data: UpdateKnowledgeBaseInput
  ): Promise<Record<string, unknown>> {
    await this.ensureKnowledgeBaseExists(id, tenantId);

    try {
      const knowledgeBase = await this.prisma.knowledgeBase.update({
        where: { id },
        data: {
          externalId: data.externalId,
          name: data.name,
          slug: data.slug ? normalizeSlug(data.slug) : undefined,
          description: data.description,
          status: data.status,
          metadata: toPrismaNullableJson(data.metadata),
        },
      });

      this.logger.info({
        event: "knowledge_base.updated",
        tenantId,
        knowledgeBaseId: id,
      });

      return serializeJsonResponse(knowledgeBase) as Record<string, unknown>;
    } catch (error) {
      throwConflictForDuplicateRecord(
        error,
        "A knowledge base with the same name, slug, or external ID already exists for this tenant."
      );
    }
  }

  /**
   * Soft-delete a tenant-scoped knowledge base.
   * @param id - Knowledge base ID.
   * @param tenantId - Tenant ID.
   */
  async delete(id: string, tenantId: string): Promise<void> {
    await this.ensureKnowledgeBaseExists(id, tenantId);
    await this.prisma.knowledgeBase.update({
      where: { id },
      data: {
        status: KnowledgeBaseStatus.DELETED,
        deletedAt: new Date(),
      },
    });

    this.logger.info({
      event: "knowledge_base.deleted",
      tenantId,
      knowledgeBaseId: id,
    });
  }

  /**
   * Ensure a tenant-scoped knowledge base exists and is active for normal reads.
   * @param id - Knowledge base ID.
   * @param tenantId - Tenant ID.
   */
  private async ensureKnowledgeBaseExists(
    id: string,
    tenantId: string
  ): Promise<void> {
    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: {
        id,
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
   * Build the Prisma filter for knowledge base list queries.
   * @param query - List query.
   * @returns Prisma where input.
   */
  private buildListWhere(
    query: ListKnowledgeBasesQuery
  ): KnowledgeBaseWhereInput {
    const searchWhere: KnowledgeBaseWhereInput | undefined = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { slug: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : undefined;

    return {
      tenantId: query.tenantId,
      organizationId: query.organizationId,
      projectId: query.projectId,
      status: query.status,
      deletedAt: null,
      ...(searchWhere ? searchWhere : {}),
    };
  }
}
