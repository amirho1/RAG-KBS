import {
  Body,
  Controller,
  Get,
  INestApplication,
  Param,
  Post,
  Query,
  VersioningType,
} from "@nestjs/common";
import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { createZodDto } from "nestjs-zod";
import request from "supertest";
import type { App } from "supertest/types.js";
import { AppController } from "./../src/app.controller.js";
import { AppService } from "./../src/app.service.js";
import { configureApiApplication } from "./../src/bootstrap/api-bootstrap.js";
import { AppConfigModule } from "./../src/config/config.module.js";
import { idParamSchema } from "./../src/common/dto/id-param.dto.js";
import { ObservabilityModule } from "./../src/common/observability.module.js";
import { Prisma } from "./../src/generated/prisma/client.js";
import { KnowledgeBasesController } from "./../src/modules/knowledge-bases/knowledge-bases.controller.js";
import { KnowledgeBasesService } from "./../src/modules/knowledge-bases/knowledge-bases.service.js";
import { z } from "zod";

const validationFixtureBodySchema = z
  .object({
    name: z.string().min(1),
    metadata: z
      .object({
        tags: z.array(z.string()).default([]),
      })
      .strict()
      .optional(),
  })
  .strict();

const validationFixtureQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
  })
  .strict();

class ValidationFixtureBodyDto extends createZodDto(
  validationFixtureBodySchema
) {}

class ValidationFixtureQueryDto extends createZodDto(
  validationFixtureQuerySchema
) {}

class ValidationFixtureIdParamDto extends createZodDto(idParamSchema) {}

type ValidationErrorResponse = {
  requestId: string;
  message: string;
  details: Array<{
    field: string;
    message: string;
  }>;
};

type ValidationSuccessResponse = {
  query: {
    page: number;
  };
};

type KnowledgeBasesServiceMock = {
  create: jest.Mock<(body: unknown) => Promise<Record<string, unknown>>>;
};

/**
 * Create a Prisma known request error fixture.
 * @param code - Prisma error code.
 * @returns Prisma known request error.
 */
function createPrismaError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Prisma failed", {
    code,
    clientVersion: "test",
  });
}

@Controller("validation-fixture")
class ValidationFixtureController {
  /**
   * Return parsed fixture request data.
   * @param params - Validated route params.
   * @param query - Validated query params.
   * @param body - Validated body.
   * @returns Parsed request data.
   */
  @Post(":id")
  create(
    @Param() params: ValidationFixtureIdParamDto,
    @Query() query: ValidationFixtureQueryDto,
    @Body() body: ValidationFixtureBodyDto
  ) {
    return {
      params,
      query,
      body,
    };
  }

  /**
   * Throw an unhandled error for exception filter assertions.
   */
  @Get("error")
  throwError(): void {
    throw new Error("Sensitive provider failure password=secret");
  }
}

describe("AppController (e2e)", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppConfigModule, ObservabilityModule],
      controllers: [AppController, ValidationFixtureController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApiApplication(app);
    await app.init();
  });

  it("/ (GET)", () => {
    return request(app.getHttpServer())
      .get("/")
      .expect(200)
      .expect("Hello World!");
  });

  it("rejects unknown DTO body fields with request IDs", async () => {
    const response = await request(app.getHttpServer())
      .post("/validation-fixture/f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4")
      .send({
        name: "docs",
        unknownField: "nope",
      })
      .expect(400);
    const body = response.body as ValidationErrorResponse;

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      path: "/validation-fixture/f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4",
    });
    expect(body.requestId).toMatch(/^req_/);
    expect(response.headers["x-request-id"]).toBe(body.requestId);
    expect(body.details).toContainEqual({
      field: "unknownField",
      message: "Unknown field: unknownField",
    });
  });

  it("returns 400 for invalid DTO values", async () => {
    const response = await request(app.getHttpServer())
      .post("/validation-fixture/not-a-uuid")
      .send({
        name: "docs",
      })
      .expect(400);
    const body = response.body as ValidationErrorResponse;

    expect(body.message).toBe("Validation failed");
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "id",
        }),
      ])
    );
  });

  it("generates request IDs when missing", async () => {
    const response = await request(app.getHttpServer())
      .post("/validation-fixture/f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4?page=2")
      .send({
        name: "docs",
        metadata: {
          tags: ["rag"],
        },
      })
      .expect(201);
    const body = response.body as ValidationSuccessResponse;

    expect(response.headers["x-request-id"]).toMatch(/^req_/);
    expect(body.query).toEqual({
      page: 2,
    });
  });

  it("preserves incoming x-request-id headers", async () => {
    const response = await request(app.getHttpServer())
      .post("/validation-fixture/f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4")
      .set("x-request-id", "external-request-123")
      .send({
        name: "docs",
      })
      .expect(201);

    expect(response.headers["x-request-id"]).toBe("external-request-123");
  });

  it("does not expose stack traces or secrets for production-style errors", async () => {
    const response = await request(app.getHttpServer())
      .get("/validation-fixture/error")
      .expect(500);

    expect(response.body).toMatchObject({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Internal server error",
      path: "/validation-fixture/error",
    });
    expect(JSON.stringify(response.body)).not.toContain("stack");
    expect(JSON.stringify(response.body)).not.toContain("password=secret");
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});

describe("KnowledgeBasesController (e2e)", () => {
  let app: INestApplication<App>;
  let knowledgeBasesService: KnowledgeBasesServiceMock;

  beforeEach(async () => {
    knowledgeBasesService = {
      create: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppConfigModule, ObservabilityModule],
      controllers: [KnowledgeBasesController],
      providers: [
        {
          provide: KnowledgeBasesService,
          useValue: knowledgeBasesService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApiApplication(app);
    app.enableVersioning({
      type: VersioningType.URI,
      prefix: "api/v",
      defaultVersion: "1",
    });
    await app.init();
  });

  it("creates a knowledge base for valid input", async () => {
    knowledgeBasesService.create.mockResolvedValue({
      id: "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4",
      tenantId: "tenant_acme",
      name: "amirhossein",
      slug: "amirhossein",
      description: "salighedar",
      metadata: {},
    });

    const response = await request(app.getHttpServer())
      .post("/api/v1/knowledge-bases")
      .send({
        tenantId: "tenant_acme",
        name: "amirhossein",
        description: "salighedar",
        metadata: {},
      })
      .expect(201);

    expect(knowledgeBasesService.create).toHaveBeenCalledWith({
      tenantId: "tenant_acme",
      name: "amirhossein",
      description: "salighedar",
      metadata: {},
    });
    expect(response.body).toMatchObject({
      id: "f1f2c580-0d4c-4fb5-9d18-69c6d8324cc4",
      tenantId: "tenant_acme",
      name: "amirhossein",
      slug: "amirhossein",
    });
  });

  it("returns 400 for invalid create input", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/knowledge-bases")
      .send({
        tenantId: "tenant_acme",
        description: "missing name",
      })
      .expect(400);

    expect(knowledgeBasesService.create).not.toHaveBeenCalled();
    expect(response.body).toMatchObject({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      path: "/api/v1/knowledge-bases",
    });
  });

  it("returns 409 for duplicate Prisma records", async () => {
    knowledgeBasesService.create.mockRejectedValue(createPrismaError("P2002"));

    const response = await request(app.getHttpServer())
      .post("/api/v1/knowledge-bases")
      .send({
        tenantId: "tenant_acme",
        name: "amirhossein",
      })
      .expect(409);

    expect(response.body).toMatchObject({
      statusCode: 409,
      error: "Conflict",
      errorCode: "DATABASE_UNIQUE_CONSTRAINT",
      path: "/api/v1/knowledge-bases",
    });
  });

  it("returns 503 for missing database schema", async () => {
    knowledgeBasesService.create.mockRejectedValue(createPrismaError("P2021"));

    const response = await request(app.getHttpServer())
      .post("/api/v1/knowledge-bases")
      .send({
        tenantId: "tenant_acme",
        name: "amirhossein",
      })
      .expect(503);

    expect(response.body).toMatchObject({
      statusCode: 503,
      error: "Service Unavailable",
      message: "Database schema is not ready. Apply migrations and retry.",
      errorCode: "DATABASE_SCHEMA_NOT_READY",
      path: "/api/v1/knowledge-bases",
    });
    expect(JSON.stringify(response.body)).not.toContain("knowledge_bases");
  });

  afterEach(async () => {
    await app.close();
  });
});
