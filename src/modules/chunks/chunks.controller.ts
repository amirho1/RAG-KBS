import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { IdParamDto } from "../../common/dto/id-param.dto.js";
import { TenantQueryDto } from "../../common/dto/tenant-query.dto.js";
import { ChunksService } from "./chunks.service.js";
import {
  FileChunksParamDto,
  ListDocumentChunksQueryDto,
  ListFileChunksQueryDto,
} from "./dto/document-chunk-query.dto.js";
import {
  DocumentChunkEmbeddingResponseDto,
  DocumentChunkResponseDto,
} from "./dto/document-chunk-response.dto.js";

/**
 * Document chunk debug endpoints.
 */
@ApiTags("Chunks")
@Controller({ path: "chunks", version: "1" })
export class ChunksController {
  constructor(private readonly chunksService: ChunksService) {}

  /**
   * List tenant-scoped chunks.
   * @param query - List query.
   * @returns Paginated chunks.
   */
  @Get()
  @ApiOperation({
    summary: "List document chunks",
    description:
      "Returns chunk metadata and text previews only. Full chunk text and vectors are never returned.",
  })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({
    description: "Chunks returned.",
    type: DocumentChunkResponseDto,
  })
  @ApiBadRequestResponse({ description: "Request validation failed." })
  list(@Query() query: ListDocumentChunksQueryDto) {
    return this.chunksService.list(query);
  }

  /**
   * Get one tenant-scoped chunk.
   * @param params - Route params.
   * @param query - Tenant query.
   * @returns Chunk metadata.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get document chunk",
    description:
      "Returns one chunk with metadata and text preview only. Full chunk text is not returned.",
  })
  @ApiParam({ name: "id", description: "Chunk UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({
    description: "Chunk returned.",
    type: DocumentChunkResponseDto,
  })
  @ApiNotFoundResponse({ description: "Chunk was not found." })
  getById(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto
  ): Promise<Record<string, unknown>> {
    return this.chunksService.getById(params.id, query.tenantId);
  }

  /**
   * Get safe embedding metadata for one chunk.
   * @param params - Route params.
   * @param query - Tenant query.
   * @returns Embedding metadata.
   */
  @Get(":id/embedding")
  @ApiOperation({
    summary: "Get chunk embedding metadata",
    description:
      "Returns embedding traceability metadata without vector values.",
  })
  @ApiParam({ name: "id", description: "Chunk UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({
    description: "Chunk embedding metadata returned.",
    type: DocumentChunkEmbeddingResponseDto,
  })
  @ApiNotFoundResponse({ description: "Chunk embedding was not found." })
  getEmbedding(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto
  ): Promise<Record<string, unknown>> {
    return this.chunksService.getEmbedding(params.id, query.tenantId);
  }
}

/**
 * File-scoped chunk debug endpoint.
 */
@ApiTags("Chunks")
@Controller({ path: "files/:fileId/chunks", version: "1" })
export class FileChunksController {
  constructor(private readonly chunksService: ChunksService) {}

  /**
   * List chunks for one file.
   * @param params - Route params.
   * @param query - List query.
   * @returns Paginated file chunks.
   */
  @Get()
  @ApiOperation({
    summary: "List file chunks",
    description:
      "Returns chunk metadata and text previews for one file. Full chunk text and vectors are never returned.",
  })
  @ApiParam({ name: "fileId", description: "File UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({ description: "File chunks returned." })
  @ApiBadRequestResponse({ description: "Request validation failed." })
  listByFile(
    @Param() params: FileChunksParamDto,
    @Query() query: ListFileChunksQueryDto
  ) {
    return this.chunksService.listByFile(params.fileId, query);
  }
}
