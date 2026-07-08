import { ConflictException, HttpStatus } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
import {
  getPrismaHttpError,
  throwConflictForDuplicateRecord,
} from "./prisma-errors.js";

/**
 * Create a mock Prisma known request error.
 * @param code - Prisma error code.
 * @returns Prisma known request error.
 */
function createKnownPrismaError(
  code: string
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Prisma failed", {
    code,
    clientVersion: "test",
  });
}

describe("prisma error helpers", () => {
  it("should map unique constraint errors to conflict responses", () => {
    const result = getPrismaHttpError(createKnownPrismaError("P2002"));

    expect(result).toEqual({
      statusCode: HttpStatus.CONFLICT,
      message: "A record with the same unique fields already exists.",
      errorCode: "DATABASE_UNIQUE_CONSTRAINT",
    });
  });

  it("should map missing record errors to not found responses", () => {
    const result = getPrismaHttpError(createKnownPrismaError("P2025"));

    expect(result).toEqual({
      statusCode: HttpStatus.NOT_FOUND,
      message: "Requested database record was not found.",
      errorCode: "DATABASE_RECORD_NOT_FOUND",
    });
  });

  it("should map relation constraint errors to conflict responses", () => {
    const result = getPrismaHttpError(createKnownPrismaError("P2003"));

    expect(result).toEqual({
      statusCode: HttpStatus.CONFLICT,
      message: "Database relation constraint failed.",
      errorCode: "DATABASE_RELATION_CONSTRAINT",
    });
  });

  it("should map missing schema errors to service unavailable responses", () => {
    const result = getPrismaHttpError(createKnownPrismaError("P2021"));

    expect(result).toEqual({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: "Database schema is not ready. Apply migrations and retry.",
      errorCode: "DATABASE_SCHEMA_NOT_READY",
    });
  });

  it("should map database connectivity errors to service unavailable responses", () => {
    const result = getPrismaHttpError(createKnownPrismaError("P1001"));

    expect(result).toEqual({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: "Database is unavailable. Please retry later.",
      errorCode: "DATABASE_UNAVAILABLE",
    });
  });

  it("should map invalid Prisma data errors to bad request responses", () => {
    const result = getPrismaHttpError(createKnownPrismaError("P2012"));

    expect(result).toEqual({
      statusCode: HttpStatus.BAD_REQUEST,
      message: "Database request data is invalid.",
      errorCode: "DATABASE_INVALID_DATA",
    });
  });

  it("should throw safe conflict exceptions for duplicate records", () => {
    expect(() =>
      throwConflictForDuplicateRecord(
        createKnownPrismaError("P2002"),
        "Duplicate knowledge base."
      )
    ).toThrow(ConflictException);
  });
});
