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
  CreateTagDto,
  FileTagParamDto,
  ListTagsQueryDto,
  SourceTagParamDto,
  UpdateTagDto,
} from "./dto/tags.dto.js";
import { TagsService } from "./tags.service.js";

/**
 * Tag metadata HTTP endpoints.
 */
@ApiTags("Tags")
@Controller({ version: "1" })
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  /**
   * Create a tenant-scoped tag.
   * @param body - Create request body.
   * @returns The created tag.
   */
  @Post("tags")
  @ApiOperation({
    summary: "Create a tag",
    description:
      "Creates a tenant-scoped searchable metadata tag. The normalized name is generated server-side.",
  })
  @ApiBody({
    type: CreateTagDto,
    examples: {
      default: {
        value: {
          tenantId: "tenant_acme",
          name: "API Docs",
          description: "Documents used for API support retrieval.",
          color: "#2563eb",
        },
      },
    },
  })
  @ApiCreatedResponse({ description: "Tag created." })
  @ApiBadRequestResponse({ description: "Request validation failed." })
  @ApiConflictResponse({ description: "Tag already exists." })
  create(@Body() body: CreateTagDto): Promise<Record<string, unknown>> {
    return this.tagsService.create(body);
  }

  /**
   * List tenant-scoped tags.
   * @param query - List query.
   * @returns Paginated tags.
   */
  @Get("tags")
  @ApiOperation({
    summary: "List tags",
    description:
      "Lists non-deleted tags for the requested tenant with pagination, sorting, and search.",
  })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({ description: "Tag list returned." })
  @ApiBadRequestResponse({ description: "Request validation failed." })
  list(@Query() query: ListTagsQueryDto) {
    return this.tagsService.list(query);
  }

  /**
   * Read one tenant-scoped tag.
   * @param params - Route params.
   * @param query - Tenant query.
   * @returns The matching tag.
   */
  @Get("tags/:id")
  @ApiOperation({
    summary: "Get a tag",
    description:
      "Returns a non-deleted tag only when it belongs to the requested tenant.",
  })
  @ApiParam({ name: "id", description: "Tag UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({ description: "Tag returned." })
  @ApiNotFoundResponse({ description: "Tag was not found." })
  getById(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto
  ): Promise<Record<string, unknown>> {
    return this.tagsService.getById(params.id, query.tenantId);
  }

  /**
   * Update one tenant-scoped tag.
   * @param params - Route params.
   * @param query - Tenant query.
   * @param body - Update request body.
   * @returns The updated tag.
   */
  @Patch("tags/:id")
  @ApiOperation({
    summary: "Update a tag",
    description:
      "Updates tag metadata and regenerates the normalized name when the display name changes.",
  })
  @ApiParam({ name: "id", description: "Tag UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiBody({ type: UpdateTagDto })
  @ApiOkResponse({ description: "Tag updated." })
  @ApiNotFoundResponse({ description: "Tag was not found." })
  @ApiConflictResponse({ description: "Tag already exists." })
  update(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto,
    @Body() body: UpdateTagDto
  ): Promise<Record<string, unknown>> {
    return this.tagsService.update(params.id, query.tenantId, body);
  }

  /**
   * Soft-delete one tenant-scoped tag.
   * @param params - Route params.
   * @param query - Tenant query.
   */
  @Delete("tags/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a tag",
    description:
      "Soft-deletes tag metadata. Existing join rows are left for relational traceability.",
  })
  @ApiParam({ name: "id", description: "Tag UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiNoContentResponse({ description: "Tag soft-deleted." })
  @ApiNotFoundResponse({ description: "Tag was not found." })
  delete(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto
  ): Promise<void> {
    return this.tagsService.delete(params.id, query.tenantId);
  }

  /**
   * Attach a tag to a source.
   * @param params - Source and tag params.
   * @param query - Tenant query.
   */
  @Post("sources/:sourceId/tags/:tagId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Attach a tag to a source",
    description:
      "Creates a source-tag assignment when both records belong to the requested tenant.",
  })
  @ApiParam({ name: "sourceId", description: "Source UUID" })
  @ApiParam({ name: "tagId", description: "Tag UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiNoContentResponse({ description: "Tag attached to source." })
  @ApiNotFoundResponse({ description: "Source or tag was not found." })
  @ApiConflictResponse({ description: "Tag is already attached." })
  attachTagToSource(
    @Param() params: SourceTagParamDto,
    @Query() query: TenantQueryDto
  ): Promise<void> {
    return this.tagsService.attachTagToSource(
      params.sourceId,
      params.tagId,
      query.tenantId
    );
  }

  /**
   * Detach a tag from a source.
   * @param params - Source and tag params.
   * @param query - Tenant query.
   */
  @Delete("sources/:sourceId/tags/:tagId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Detach a tag from a source",
    description:
      "Deletes a source-tag assignment after validating tenant scope for both records.",
  })
  @ApiParam({ name: "sourceId", description: "Source UUID" })
  @ApiParam({ name: "tagId", description: "Tag UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiNoContentResponse({ description: "Tag detached from source." })
  @ApiNotFoundResponse({
    description: "Assignment, source, or tag was not found.",
  })
  detachTagFromSource(
    @Param() params: SourceTagParamDto,
    @Query() query: TenantQueryDto
  ): Promise<void> {
    return this.tagsService.detachTagFromSource(
      params.sourceId,
      params.tagId,
      query.tenantId
    );
  }

  /**
   * Attach a tag to a file.
   * @param params - File and tag params.
   * @param query - Tenant query.
   */
  @Post("files/:fileId/tags/:tagId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Attach a tag to a file",
    description:
      "Creates a file-tag assignment when both records belong to the requested tenant.",
  })
  @ApiParam({ name: "fileId", description: "File UUID" })
  @ApiParam({ name: "tagId", description: "Tag UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiNoContentResponse({ description: "Tag attached to file." })
  @ApiNotFoundResponse({ description: "File or tag was not found." })
  @ApiConflictResponse({ description: "Tag is already attached." })
  attachTagToFile(
    @Param() params: FileTagParamDto,
    @Query() query: TenantQueryDto
  ): Promise<void> {
    return this.tagsService.attachTagToFile(
      params.fileId,
      params.tagId,
      query.tenantId
    );
  }

  /**
   * Detach a tag from a file.
   * @param params - File and tag params.
   * @param query - Tenant query.
   */
  @Delete("files/:fileId/tags/:tagId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Detach a tag from a file",
    description:
      "Deletes a file-tag assignment after validating tenant scope for both records.",
  })
  @ApiParam({ name: "fileId", description: "File UUID" })
  @ApiParam({ name: "tagId", description: "Tag UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiNoContentResponse({ description: "Tag detached from file." })
  @ApiNotFoundResponse({
    description: "Assignment, file, or tag was not found.",
  })
  detachTagFromFile(
    @Param() params: FileTagParamDto,
    @Query() query: TenantQueryDto
  ): Promise<void> {
    return this.tagsService.detachTagFromFile(
      params.fileId,
      params.tagId,
      query.tenantId
    );
  }
}
