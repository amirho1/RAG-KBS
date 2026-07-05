import {
  Body,
  Controller,
  Post,
  UploadedFile as UploadedFileDecorator,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { UploadFileResponseDto } from "./dto/storage-object-response.dto.js";
import { UploadFileDto } from "./dto/upload-file.dto.js";
import type { UploadedFile } from "./interfaces/uploaded-file.interface.js";
import { StorageService } from "./storage.service.js";

/**
 * Binary storage HTTP endpoints.
 */
@ApiTags("Storage")
@Controller({ path: "storage", version: "1" })
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Upload a binary file and create storage metadata.
   * @param body - Multipart text fields.
   * @param file - Uploaded multipart file.
   * @returns Safe storage object and document file metadata.
   */
  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Upload a file to object storage",
    description:
      "Stores the uploaded binary through the configured storage driver and creates StorageObject and DocumentFile metadata. This endpoint does not parse, chunk, embed, index, or enqueue ingestion.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["tenantId", "sourceId", "file"],
      properties: {
        tenantId: {
          type: "string",
          example: "tenant_acme",
        },
        organizationId: {
          type: "string",
          example: "org_acme",
        },
        projectId: {
          type: "string",
          example: "project_docs",
        },
        sourceId: {
          type: "string",
          format: "uuid",
          example: "adf1ed11-f72e-4af4-9a1b-9d6d9941d30e",
        },
        knowledgeBaseId: {
          type: "string",
          format: "uuid",
          example: "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4",
        },
        title: {
          type: "string",
          example: "Product manual",
        },
        description: {
          type: "string",
          example: "Source document for future ingestion.",
        },
        metadata: {
          type: "string",
          example: '{"category":"manual","language":"en"}',
        },
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "File stored and metadata created.",
    type: UploadFileResponseDto,
  })
  @ApiBadRequestResponse({ description: "Request validation failed." })
  @ApiNotFoundResponse({ description: "Source was not found." })
  @ApiConflictResponse({
    description: "A file with the same checksum already exists in this source.",
  })
  upload(
    @Body() body: UploadFileDto,
    @UploadedFileDecorator() file: UploadedFile | undefined
  ): Promise<Record<string, unknown>> {
    return this.storageService.uploadFile(body, file);
  }
}
