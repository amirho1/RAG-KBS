import { HttpException, HttpStatus } from "@nestjs/common";
import { describe, expect, it, jest } from "@jest/globals";
import { Prisma } from "../../generated/prisma/client.js";
import { GlobalExceptionFilter } from "./global-exception.filter.js";

/**
 * Create a Prisma known request error fixture.
 * @param code - Prisma error code.
 * @returns Prisma known request error.
 */
function createPrismaError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    "The table `public.knowledge_bases` does not exist in the current database.",
    {
      code,
      clientVersion: "test",
    }
  );
}

/**
 * Create an arguments host fixture for exception filter tests.
 * @returns Host fixture pieces.
 */
function createHostFixture() {
  const request = {
    method: "POST",
    headers: {
      "x-request-id": "req_test",
    },
    originalUrl: "/api/v1/query",
  };
  const setHeader = jest.fn<(...args: any[]) => unknown>();
  const status = jest.fn<(...args: any[]) => unknown>();
  const json = jest.fn<(...args: any[]) => unknown>();
  const response = {
    locals: {},
    setHeader,
    status,
    json,
  };
  status.mockReturnValue(response);
  json.mockReturnValue(response);
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  };

  return { host, response };
}

/**
 * Create the global exception filter with mocked dependencies.
 * @returns Global exception filter.
 */
function createFilter(): GlobalExceptionFilter {
  return new GlobalExceptionFilter(
    {
      getRequestId: jest.fn(() => "req_test"),
    } as never,
    {
      errorPayload: jest.fn(),
    } as never
  );
}

describe("GlobalExceptionFilter", () => {
  it("should include explicit safe error codes in responses", () => {
    const filter = createFilter();
    const { host, response } = createHostFixture();

    filter.catch(
      new HttpException(
        {
          message: "Retrieval failed.",
          errorCode: "QDRANT_SEARCH_FAILED",
        },
        HttpStatus.SERVICE_UNAVAILABLE
      ),
      host as never
    );

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.SERVICE_UNAVAILABLE
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "QDRANT_SEARCH_FAILED",
        message: "Internal server error",
      })
    );
  });

  it("should map missing Prisma schema errors to safe service unavailable responses", () => {
    const logger = {
      errorPayload: jest.fn(),
    };
    const filter = new GlobalExceptionFilter(
      {
        getRequestId: jest.fn(() => "req_test"),
      } as never,
      logger as never
    );
    const { host, response } = createHostFixture();

    filter.catch(createPrismaError("P2021"), host as never);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.SERVICE_UNAVAILABLE
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        errorCode: "DATABASE_SCHEMA_NOT_READY",
        message: "Database schema is not ready. Apply migrations and retry.",
        requestId: "req_test",
        path: "/api/v1/query",
      })
    );
    expect(logger.errorPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "http.exception",
        requestId: "req_test",
        method: "POST",
        path: "/api/v1/query",
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      }),
      "Unhandled HTTP exception"
    );
  });
});
