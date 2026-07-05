import { ConflictException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";

/**
 * Determine whether an error is a Prisma unique constraint error.
 * @param error - Caught error value.
 * @returns True when the error represents a unique constraint conflict.
 */
export function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * Determine whether an error is a Prisma missing record error.
 * @param error - Caught error value.
 * @returns True when the error represents a missing record.
 */
export function isPrismaRecordNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
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
    throw new ConflictException(message);
  }

  throw error;
}
