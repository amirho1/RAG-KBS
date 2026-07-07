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
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { CancelIngestionJobQueryDto } from "./dto/cancel-ingestion-job.dto.js";
import { CreateIngestionJobDto } from "./dto/create-ingestion-job.dto.js";
import { IngestFileParamDto } from "./dto/ingest-file-param.dto.js";
import { ListIngestionJobsQueryDto } from "./dto/ingestion-job-query.dto.js";
import { IngestionJobResponseDto } from "./dto/ingestion-job-response.dto.js";
import { RetryIngestionJobQueryDto } from "./dto/retry-ingestion-job.dto.js";
import { IngestionService } from "./services/ingestion.service.js";

/**
 * Ingestion HTTP endpoints.
 */
@ApiTags("Ingestion")
@Controller({ path: "", version: "1" })
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  /**
   * Create an ingestion job for a file.
   * @param params - File route params.
   * @param body - Create ingestion request.
   * @returns Created or reused ingestion job.
   */
  @Post("files/:id/ingest")
  @ApiOperation({
    summary: "Create file ingestion job",
    description:
      "Creates or reuses a tenant-scoped BullMQ ingestion job for a stored text or Markdown file.",
  })
  @ApiParam({ name: "id", description: "Document file UUID" })
  @ApiBody({
    type: CreateIngestionJobDto,
    examples: {
      default: {
        value: {
          tenantId: "tenant_acme",
          force: false,
          reason: "INITIAL_INGESTION",
          metadata: {
            requestedBy: "api-gateway",
          },
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Ingestion job created, queued, or reused.",
    type: IngestionJobResponseDto,
  })
  @ApiBadRequestResponse({
    description: "File cannot be ingested or MIME type is unsupported.",
  })
  @ApiNotFoundResponse({ description: "File was not found." })
  @ApiServiceUnavailableResponse({
    description: "The ingestion job could not be queued.",
  })
  createFileIngestionJob(
    @Param() params: IngestFileParamDto,
    @Body() body: CreateIngestionJobDto
  ): Promise<Record<string, unknown>> {
    return this.ingestionService.createFileIngestionJob(params.id, body);
  }

  /**
   * Get one ingestion job.
   * @param params - Route params.
   * @param query - Tenant query.
   * @returns Safe ingestion job response.
   */
  @Get("ingestion-jobs/:id")
  @ApiOperation({
    summary: "Get ingestion job",
    description:
      "Returns one tenant-scoped ingestion job with safe metadata and latest attempt summary.",
  })
  @ApiParam({ name: "id", description: "Ingestion job UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({
    description: "Ingestion job returned.",
    type: IngestionJobResponseDto,
  })
  @ApiNotFoundResponse({ description: "Ingestion job was not found." })
  getById(
    @Param() params: IdParamDto,
    @Query() query: TenantQueryDto
  ): Promise<Record<string, unknown>> {
    return this.ingestionService.getById(params.id, query.tenantId);
  }

  /**
   * List ingestion jobs.
   * @param query - List query.
   * @returns Paginated ingestion jobs.
   */
  @Get("ingestion-jobs")
  @ApiOperation({
    summary: "List ingestion jobs",
    description:
      "Lists tenant-scoped ingestion jobs with file, source, knowledge base, status, type, date range, pagination, and sorting filters.",
  })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({ description: "Ingestion job list returned." })
  list(@Query() query: ListIngestionJobsQueryDto) {
    return this.ingestionService.list(query);
  }

  /**
   * Retry a failed or cancelled ingestion job.
   * @param params - Route params.
   * @param query - Tenant query.
   * @returns Requeued ingestion job.
   */
  @Post("ingestion-jobs/:id/retry")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Retry ingestion job",
    description:
      "Retries a failed or cancelled tenant-scoped ingestion job without creating duplicate active work.",
  })
  @ApiParam({ name: "id", description: "Ingestion job UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({
    description: "Ingestion job requeued.",
    type: IngestionJobResponseDto,
  })
  @ApiConflictResponse({
    description: "The job status is not safe to retry.",
  })
  @ApiNotFoundResponse({ description: "Ingestion job was not found." })
  retryJob(
    @Param() params: IdParamDto,
    @Query() query: RetryIngestionJobQueryDto
  ): Promise<Record<string, unknown>> {
    return this.ingestionService.retryJob(params.id, query);
  }

  /**
   * Cancel a pending or queued ingestion job.
   * @param params - Route params.
   * @param query - Tenant query.
   * @returns Cancelled ingestion job.
   */
  @Post("ingestion-jobs/:id/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Cancel ingestion job",
    description:
      "Cancels a tenant-scoped ingestion job only when it has not started processing.",
  })
  @ApiParam({ name: "id", description: "Ingestion job UUID" })
  @ApiQuery({ name: "tenantId", required: true, example: "tenant_acme" })
  @ApiOkResponse({
    description: "Ingestion job cancelled.",
    type: IngestionJobResponseDto,
  })
  @ApiConflictResponse({
    description: "The job has already started or finished.",
  })
  @ApiNotFoundResponse({ description: "Ingestion job was not found." })
  cancelJob(
    @Param() params: IdParamDto,
    @Query() query: CancelIngestionJobQueryDto
  ): Promise<Record<string, unknown>> {
    return this.ingestionService.cancelJob(params.id, query);
  }
}
