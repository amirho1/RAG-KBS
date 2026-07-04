import {
  Body,
  Controller,
  Get,
  INestApplication,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { createZodDto } from "nestjs-zod";
import request from "supertest";
import type { App } from "supertest/types.js";
import { AppModule } from "./../src/app.module.js";
import { configureApiApplication } from "./../src/bootstrap/api-bootstrap.js";
import { idParamSchema } from "./../src/common/dto/id-param.dto.js";
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
      imports: [AppModule],
      controllers: [ValidationFixtureController],
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
    await app.close();
  });
});
