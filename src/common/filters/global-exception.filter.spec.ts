import { HttpException, HttpStatus } from "@nestjs/common";
import { describe, expect, it, jest } from "@jest/globals";
import { GlobalExceptionFilter } from "./global-exception.filter.js";

/**
 * Create an arguments host fixture for exception filter tests.
 * @returns Host fixture pieces.
 */
function createHostFixture() {
  const request = {
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

describe("GlobalExceptionFilter", () => {
  it("should include explicit safe error codes in responses", () => {
    const filter = new GlobalExceptionFilter({
      getRequestId: jest.fn(() => "req_test"),
    } as never);
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
});
