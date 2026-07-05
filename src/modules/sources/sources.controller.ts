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
  CreateSourceDto,
  ListSourcesQueryDto,
  UpdateSourceDto,
} from "./dto/sources.dto.js";
import { SourcesService } from "./sources.service.js";

/**
 * Source metadata HTTP endpoints.
 */
@ApiTags("Sources")
@Controller({ path: "sources", version: "1" })
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  /**
   * Create a source in a knowledge base.
   * @param body - Create request body.
   * @returns The created source.
   */
  @Post()
  @ApiOperation({
    summary: "Create a source",
    description:
      "Creates logical source metadata inside a tenant-scoped knowledge base. This does not ingest content.",
  })
  @ApiBody({
    type: CreateSourceDto,
    examples: {
      default: {
        value: {
          tenantId: "tenant_acme",
          knowledgeBaseId: "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4",
          name: "OpenAPI docs",
          type: "OPENAPI",
          description: "Uploaded API specification sources.",
        },
      },
    },
  })
  @ApiCreatedResponse({ description: "Source created." })
  @ApiBadRequestResponse({ description: "Request validation failed." })
  @ApiNotFoundResponse({ description: "Knowledge base was not found." })
  @ApiConflictResponse({ description: "Source already exists." })
  create(@Body() body: CreateSourceDto): Promise<Record<string, unknown>> {
    return this.sourcesService.create(body);
  }

  /**
   * List tenant-scoped sources.
   * @param query - List query.
   * @returns Paginated sources.
   */
  @Get()
  @ApiOperation({
    summary: "List sources",
    description:
      "Lists non-deleted sources for a tenant with optional knowledge base, status, type, search, and tag filters.",
  })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({ description: "Source list returned." })
  @ApiBadRequestResponse({ description: "Request validation failed." })
  list(@Query() query: ListSourcesQueryDto) {
    return this.sourcesService.list(query);
  }

  /**
   * Read one tenant-scoped source.
   * @param params - Route params.
   * @param query - Tenant query.
   * @returns The matching source.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get a source",
    description:
      "Returns a source with tag summaries only when it belongs to the requested tenant.",
  })
  @ApiParam({ name: "id", description: "Source UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({ description: "Source returned." })
  @ApiNotFoundResponse({ description: "Source was not found." })
  getById(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto
  ): Promise<Record<string, unknown>> {
    return this.sourcesService.getById(params.id, query.tenantId);
  }

  /**
   * Update one tenant-scoped source.
   * @param params - Route params.
   * @param query - Tenant query.
   * @param body - Update request body.
   * @returns The updated source.
   */
  @Patch(":id")
  @ApiOperation({
    summary: "Update a source",
    description:
      "Updates logical source metadata. This does not parse, chunk, embed, or re-index content.",
  })
  @ApiParam({ name: "id", description: "Source UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiBody({ type: UpdateSourceDto })
  @ApiOkResponse({ description: "Source updated." })
  @ApiNotFoundResponse({ description: "Source was not found." })
  @ApiConflictResponse({ description: "Source already exists." })
  update(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto,
    @Body() body: UpdateSourceDto
  ): Promise<Record<string, unknown>> {
    return this.sourcesService.update(params.id, query.tenantId, body);
  }

  /**
   * Soft-delete one tenant-scoped source.
   * @param params - Route params.
   * @param query - Tenant query.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a source",
    description:
      "Soft-deletes source metadata. Vector cleanup is intentionally left to future maintenance modules.",
  })
  @ApiParam({ name: "id", description: "Source UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiNoContentResponse({ description: "Source soft-deleted." })
  @ApiNotFoundResponse({ description: "Source was not found." })
  delete(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto
  ): Promise<void> {
    return this.sourcesService.delete(params.id, query.tenantId);
  }
}
