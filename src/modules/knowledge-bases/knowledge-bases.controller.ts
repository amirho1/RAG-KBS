import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { IdParamDto } from "../../common/dto/id-param.dto.js";
import { TenantQueryDto } from "../../common/dto/tenant-query.dto.js";
import {
  CreateKnowledgeBaseDto,
  ListKnowledgeBasesQueryDto,
  UpdateKnowledgeBaseDto,
} from "./dto/knowledge-bases.dto.js";
import { KnowledgeBasesService } from "./knowledge-bases.service.js";

/**
 * Knowledge base metadata HTTP endpoints.
 */
@ApiTags("Knowledge Bases")
@Controller({ path: "knowledge-bases", version: "1" })
export class KnowledgeBasesController {
  constructor(private readonly knowledgeBasesService: KnowledgeBasesService) {}

  /**
   * Create a tenant-scoped knowledge base.
   * @param body - Create request body.
   * @returns The created knowledge base.
   */
  @Post()
  @ApiOperation({
    summary: "Create a knowledge base",
    description:
      "Creates the source-of-truth metadata record for a tenant-scoped RAG knowledge base.",
  })
  @ApiBody({
    type: CreateKnowledgeBaseDto,
    examples: {
      default: {
        value: {
          tenantId: "tenant_acme",
          name: "API Documentation",
          description: "Public API docs for retrieval.",
          metadata: { domain: "developer-docs" },
        },
      },
    },
  })
  @ApiCreatedResponse({ description: "Knowledge base created." })
  @ApiBadRequestResponse({ description: "Request validation failed." })
  @ApiConflictResponse({ description: "Knowledge base already exists." })
  create(
    @Body() body: CreateKnowledgeBaseDto
  ): Promise<Record<string, unknown>> {
    return this.knowledgeBasesService.create(body);
  }

  /**
   * List tenant-scoped knowledge bases.
   * @param query - List query.
   * @returns Paginated knowledge bases.
   */
  @Get()
  @ApiOperation({
    summary: "List knowledge bases",
    description:
      "Lists non-deleted knowledge bases for the requested tenant with pagination and sorting.",
  })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({ description: "Knowledge base list returned." })
  @ApiBadRequestResponse({ description: "Request validation failed." })
  list(@Query() query: ListKnowledgeBasesQueryDto) {
    return this.knowledgeBasesService.list(query);
  }

  /**
   * Read one tenant-scoped knowledge base.
   * @param params - Route params.
   * @param query - Tenant query.
   * @returns The matching knowledge base.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get a knowledge base",
    description:
      "Returns a non-deleted knowledge base only when it belongs to the requested tenant.",
  })
  @ApiParam({ name: "id", description: "Knowledge base UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({ description: "Knowledge base returned." })
  @ApiNotFoundResponse({ description: "Knowledge base was not found." })
  getById(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto
  ): Promise<Record<string, unknown>> {
    return this.knowledgeBasesService.getById(params.id, query.tenantId);
  }

  /**
   * Update one tenant-scoped knowledge base.
   * @param params - Route params.
   * @param query - Tenant query.
   * @param body - Update request body.
   * @returns The updated knowledge base.
   */
  @Patch(":id")
  @ApiOperation({
    summary: "Update a knowledge base",
    description:
      "Updates metadata for a non-deleted knowledge base scoped to the requested tenant.",
  })
  @ApiParam({ name: "id", description: "Knowledge base UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiBody({ type: UpdateKnowledgeBaseDto })
  @ApiOkResponse({ description: "Knowledge base updated." })
  @ApiNotFoundResponse({ description: "Knowledge base was not found." })
  @ApiConflictResponse({ description: "Knowledge base already exists." })
  update(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto,
    @Body() body: UpdateKnowledgeBaseDto
  ): Promise<Record<string, unknown>> {
    return this.knowledgeBasesService.update(params.id, query.tenantId, body);
  }

  /**
   * Soft-delete one tenant-scoped knowledge base.
   * @param params - Route params.
   * @param query - Tenant query.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a knowledge base",
    description:
      "Soft-deletes a knowledge base by setting deletedAt and a deleted lifecycle status.",
  })
  @ApiParam({ name: "id", description: "Knowledge base UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiNoContentResponse({ description: "Knowledge base soft-deleted." })
  @ApiNotFoundResponse({ description: "Knowledge base was not found." })
  delete(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto
  ): Promise<void> {
    return this.knowledgeBasesService.delete(params.id, query.tenantId);
  }
}
