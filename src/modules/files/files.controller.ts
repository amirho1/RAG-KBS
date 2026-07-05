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
  CreateFileDto,
  ListFilesQueryDto,
  UpdateFileDto,
} from "./dto/files.dto.js";
import { FilesService } from "./files.service.js";

/**
 * Document file metadata HTTP endpoints.
 */
@ApiTags("Files")
@Controller({ path: "files", version: "1" })
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * Create document file metadata.
   * @param body - Create request body.
   * @returns The created document file.
   */
  @Post()
  @ApiOperation({
    summary: "Create file metadata",
    description:
      "Creates a logical document file record linked to a source and storage object. It does not parse, chunk, embed, or index content.",
  })
  @ApiBody({
    type: CreateFileDto,
    examples: {
      default: {
        value: {
          tenantId: "tenant_acme",
          sourceId: "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4",
          storageObjectId: "6f7e4a08-4c14-4ca4-82c0-b3d63dfdc86b",
          originalName: "openapi.yaml",
          mimeType: "application/yaml",
          fileType: "OPENAPI",
          sizeBytes: "2048",
          checksumSha256:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          title: "OpenAPI specification",
        },
      },
    },
  })
  @ApiCreatedResponse({ description: "File metadata created." })
  @ApiBadRequestResponse({ description: "Request validation failed." })
  @ApiNotFoundResponse({
    description: "Source or storage object was not found.",
  })
  @ApiConflictResponse({ description: "File already exists in this source." })
  create(@Body() body: CreateFileDto): Promise<Record<string, unknown>> {
    return this.filesService.create(body);
  }

  /**
   * List tenant-scoped document files.
   * @param query - List query.
   * @returns Paginated document files.
   */
  @Get()
  @ApiOperation({
    summary: "List files",
    description:
      "Lists non-deleted document file metadata for a tenant with source, status, file type, search, and tag filters.",
  })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({ description: "File list returned." })
  @ApiBadRequestResponse({ description: "Request validation failed." })
  list(@Query() query: ListFilesQueryDto) {
    return this.filesService.list(query);
  }

  /**
   * Read one tenant-scoped document file.
   * @param params - Route params.
   * @param query - Tenant query.
   * @returns The matching document file.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get file metadata",
    description:
      "Returns file metadata with tag summaries only when it belongs to the requested tenant.",
  })
  @ApiParam({ name: "id", description: "File UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({ description: "File returned." })
  @ApiNotFoundResponse({ description: "File was not found." })
  getById(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto
  ): Promise<Record<string, unknown>> {
    return this.filesService.getById(params.id, query.tenantId);
  }

  /**
   * Update tenant-scoped document file metadata.
   * @param params - Route params.
   * @param query - Tenant query.
   * @param body - Update request body.
   * @returns The updated document file.
   */
  @Patch(":id")
  @ApiOperation({
    summary: "Update file metadata",
    description:
      "Updates logical file metadata without running ingestion or modifying stored binary content.",
  })
  @ApiParam({ name: "id", description: "File UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiBody({ type: UpdateFileDto })
  @ApiOkResponse({ description: "File updated." })
  @ApiNotFoundResponse({ description: "File was not found." })
  @ApiConflictResponse({ description: "File already exists in this source." })
  update(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto,
    @Body() body: UpdateFileDto
  ): Promise<Record<string, unknown>> {
    return this.filesService.update(params.id, query.tenantId, body);
  }

  /**
   * Soft-delete tenant-scoped document file metadata.
   * @param params - Route params.
   * @param query - Tenant query.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete file metadata",
    description:
      "Soft-deletes file metadata. Vector cleanup is intentionally left to future maintenance modules.",
  })
  @ApiParam({ name: "id", description: "File UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiNoContentResponse({ description: "File metadata soft-deleted." })
  @ApiNotFoundResponse({ description: "File was not found." })
  delete(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto
  ): Promise<void> {
    return this.filesService.delete(params.id, query.tenantId);
  }
}
