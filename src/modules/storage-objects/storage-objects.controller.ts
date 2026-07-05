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
  CreateStorageObjectDto,
  ListStorageObjectsQueryDto,
  UpdateStorageObjectDto,
} from "./dto/storage-objects.dto.js";
import { StorageObjectsService } from "./storage-objects.service.js";

/**
 * Storage object metadata HTTP endpoints.
 */
@ApiTags("Storage Objects")
@Controller({ path: "storage-objects", version: "1" })
export class StorageObjectsController {
  constructor(private readonly storageObjectsService: StorageObjectsService) {}

  /**
   * Create storage object metadata.
   * @param body - Create request body.
   * @returns The created storage object.
   */
  @Post()
  @ApiOperation({
    summary: "Create storage object metadata",
    description:
      "Creates physical object metadata for local, MinIO, S3, or compatible storage. Binary upload is not handled here.",
  })
  @ApiBody({
    type: CreateStorageObjectDto,
    examples: {
      default: {
        value: {
          tenantId: "tenant_acme",
          provider: "S3",
          bucket: "rag-documents",
          objectKey: "tenant_acme/openapi.yaml",
          originalName: "openapi.yaml",
          mimeType: "application/yaml",
          sizeBytes: "2048",
          checksumSha256:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
      },
    },
  })
  @ApiCreatedResponse({ description: "Storage object metadata created." })
  @ApiBadRequestResponse({ description: "Request validation failed." })
  @ApiConflictResponse({ description: "Storage object already exists." })
  create(
    @Body() body: CreateStorageObjectDto
  ): Promise<Record<string, unknown>> {
    return this.storageObjectsService.create(body);
  }

  /**
   * List tenant-scoped storage objects.
   * @param query - List query.
   * @returns Paginated storage objects.
   */
  @Get()
  @ApiOperation({
    summary: "List storage objects",
    description:
      "Lists non-deleted storage metadata records for a tenant with pagination and filters.",
  })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({ description: "Storage object list returned." })
  @ApiBadRequestResponse({ description: "Request validation failed." })
  list(@Query() query: ListStorageObjectsQueryDto) {
    return this.storageObjectsService.list(query);
  }

  /**
   * Read one tenant-scoped storage object.
   * @param params - Route params.
   * @param query - Tenant query.
   * @returns The matching storage object.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get storage object metadata",
    description:
      "Returns storage metadata only when it belongs to the requested tenant.",
  })
  @ApiParam({ name: "id", description: "Storage object UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({ description: "Storage object returned." })
  @ApiNotFoundResponse({ description: "Storage object was not found." })
  getById(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto
  ): Promise<Record<string, unknown>> {
    return this.storageObjectsService.getById(params.id, query.tenantId);
  }

  /**
   * Update tenant-scoped storage object metadata.
   * @param params - Route params.
   * @param query - Tenant query.
   * @param body - Update request body.
   * @returns The updated storage object.
   */
  @Patch(":id")
  @ApiOperation({
    summary: "Update storage object metadata",
    description:
      "Updates storage metadata fields without reading, writing, or deleting binary object content.",
  })
  @ApiParam({ name: "id", description: "Storage object UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiBody({ type: UpdateStorageObjectDto })
  @ApiOkResponse({ description: "Storage object updated." })
  @ApiNotFoundResponse({ description: "Storage object was not found." })
  @ApiConflictResponse({ description: "Storage object already exists." })
  update(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto,
    @Body() body: UpdateStorageObjectDto
  ): Promise<Record<string, unknown>> {
    return this.storageObjectsService.update(params.id, query.tenantId, body);
  }

  /**
   * Soft-delete tenant-scoped storage object metadata.
   * @param params - Route params.
   * @param query - Tenant query.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete storage object metadata",
    description:
      "Soft-deletes the metadata record only. It does not delete the stored binary object.",
  })
  @ApiParam({ name: "id", description: "Storage object UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiNoContentResponse({
    description: "Storage object metadata soft-deleted.",
  })
  @ApiNotFoundResponse({ description: "Storage object was not found." })
  delete(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto
  ): Promise<void> {
    return this.storageObjectsService.delete(params.id, query.tenantId);
  }
}
