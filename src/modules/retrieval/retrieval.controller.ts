import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiGatewayTimeoutResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import { IdParamDto } from "../../common/dto/id-param.dto.js";
import { TenantQueryDto } from "../../common/dto/tenant-query.dto.js";
import { RetrievalQueryDto } from "./dto/retrieval-query.dto.js";
import {
  RetrievalQueryDebugResponseDto,
  RetrievalQueryResponseDto,
} from "./dto/retrieval-result.dto.js";
import { RetrievalService } from "./services/retrieval.service.js";

/**
 * Retrieval HTTP endpoints.
 */
@ApiTags("Retrieval")
@Controller({ path: "", version: "1" })
export class RetrievalController {
  constructor(private readonly retrievalService: RetrievalService) {}

  /**
   * Query the vector index and return relevant chunks.
   * @param body - Retrieval query body.
   * @returns Retrieved context chunks.
   */
  @Post("query")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Retrieve relevant context chunks",
    description:
      "Embeds a query, searches Qdrant with tenant-scoped payload filters, stores retrieval traceability, and returns chunks only. It does not generate final AI answers.",
  })
  @ApiBody({
    type: RetrievalQueryDto,
    examples: {
      default: {
        value: {
          tenantId: "tenant_acme",
          knowledgeBaseId: "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4",
          query: "How do I upload documents?",
          topK: 8,
          scoreThreshold: 0.2,
          filters: {
            sourceIds: ["adf1ed11-f72e-4af4-9a1b-9d6d9941d30e"],
            fileIds: ["113d5fe3-927e-428d-9b55-557a6f776ed9"],
            tags: ["policy", "api-docs"],
            mimeTypes: ["text/markdown"],
            language: "en",
          },
          includeMetadata: true,
          includeText: true,
          metadata: {},
        },
      },
    },
  })
  @ApiOkResponse({
    description: "Relevant chunks returned.",
    type: RetrievalQueryResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Request validation or retrieval filter validation failed.",
  })
  @ApiNotFoundResponse({ description: "Knowledge base was not found." })
  @ApiServiceUnavailableResponse({
    description: "Embedding or Qdrant dependency failed safely.",
  })
  @ApiGatewayTimeoutResponse({ description: "Retrieval timed out." })
  query(@Body() body: RetrievalQueryDto) {
    return this.retrievalService.query(body);
  }

  /**
   * Get one retrieval query debug record.
   * @param params - Route params.
   * @param query - Tenant query.
   * @returns Retrieval query traceability summary.
   */
  @Get("retrieval-queries/:id")
  @ApiOperation({
    summary: "Get retrieval query traceability",
    description:
      "Returns tenant-scoped retrieval query metadata and result summaries without vectors.",
  })
  @ApiParam({ name: "id", description: "Retrieval query UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({
    description: "Retrieval query returned.",
    type: RetrievalQueryDebugResponseDto,
  })
  @ApiNotFoundResponse({ description: "Retrieval query was not found." })
  getById(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto
  ): Promise<Record<string, unknown>> {
    return this.retrievalService.getById(params.id, query.tenantId);
  }
}
