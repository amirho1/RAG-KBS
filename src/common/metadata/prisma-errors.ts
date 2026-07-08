import { ConflictException, HttpStatus } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";

export type PrismaHttpError = {
  statusCode: number;
  message: string;
  errorCode: string;
};

const databaseUnavailableErrorCodes = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1003",
  "P1008",
  "P1010",
  "P1011",
  "P1013",
  "P1017",
]);

const databaseInvalidDataErrorCodes = new Set([
  "P2000",
  "P2005",
  "P2006",
  "P2007",
  "P2011",
  "P2012",
  "P2013",
  "P2019",
  "P2020",
]);

/**
 * Determine whether an error is a Prisma unique constraint error.
 * @param error - Caught error value.
 * @returns True when the error represents a unique constraint conflict.
 */
export function isPrismaUniqueConstraintError(error: unknown): boolean {
  return isPrismaKnownRequestError(error) && error.code === "P2002";
}

/**
 * Determine whether an error is a Prisma missing record error.
 * @param error - Caught error value.
 * @returns True when the error represents a missing record.
 */
export function isPrismaRecordNotFoundError(error: unknown): boolean {
  return isPrismaKnownRequestError(error) && error.code === "P2025";
}

/**
 * Map known Prisma failures to safe HTTP error metadata.
 * @param error - Caught error value.
 * @returns Safe HTTP error metadata when the error is a known Prisma failure.
 */
export function getPrismaHttpError(
  error: unknown
): PrismaHttpError | undefined {
  if (isPrismaKnownRequestError(error)) {
    return getKnownRequestErrorHttpMetadata(error.code);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: "Database is unavailable. Please retry later.",
      errorCode: "DATABASE_UNAVAILABLE",
    };
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: "Database request data is invalid.",
      errorCode: "DATABASE_INVALID_DATA",
    };
  }

  return undefined;
}

/**
 * Throw a safe conflict exception when Prisma reports a duplicate record.
 * @param error - Caught error value.
 * @param message - Safe conflict message.
 */
export function throwConflictForDuplicateRecord(
  error: unknown,
  message: string
): never {
  if (isPrismaUniqueConstraintError(error)) {
    throw new ConflictException({
      message,
      errorCode: "DATABASE_UNIQUE_CONSTRAINT",
    });
  }

  throw error;
}

/**
 * Determine whether an error is a known Prisma request error.
 * @param error - Caught error value.
 * @returns True when the value is a Prisma known request error.
 */
function isPrismaKnownRequestError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

/**
 * Map a known Prisma request error code to safe HTTP metadata.
 * @param code - Prisma request error code.
 * @returns Safe HTTP metadata when the code is known.
 */
function getKnownRequestErrorHttpMetadata(
  code: string
): PrismaHttpError | undefined {
  if (code === "P2002") {
    return {
      statusCode: HttpStatus.CONFLICT,
      message: "A record with the same unique fields already exists.",
      errorCode: "DATABASE_UNIQUE_CONSTRAINT",
    };
  }

  if (code === "P2025") {
    return {
      statusCode: HttpStatus.NOT_FOUND,
      message: "Requested database record was not found.",
      errorCode: "DATABASE_RECORD_NOT_FOUND",
    };
  }

  if (code === "P2003" || code === "P2014") {
    return {
      statusCode: HttpStatus.CONFLICT,
      message: "Database relation constraint failed.",
      errorCode: "DATABASE_RELATION_CONSTRAINT",
    };
  }

  if (code === "P2021" || code === "P2022") {
    return {
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: "Database schema is not ready. Apply migrations and retry.",
      errorCode: "DATABASE_SCHEMA_NOT_READY",
    };
  }

  if (databaseUnavailableErrorCodes.has(code)) {
    return {
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: "Database is unavailable. Please retry later.",
      errorCode: "DATABASE_UNAVAILABLE",
    };
  }

  if (databaseInvalidDataErrorCodes.has(code)) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: "Database request data is invalid.",
      errorCode: "DATABASE_INVALID_DATA",
    };
  }

  return undefined;
}
