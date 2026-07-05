import { z } from "zod";

const sha256Pattern = /^[a-fA-F0-9]{64}$/;
const mimeTypePattern =
  /^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*$/;
const positiveIntegerPattern = /^[1-9]\d*$/;

/**
 * Validate SHA-256 checksum values.
 */
export const checksumSha256Schema = z
  .string()
  .trim()
  .regex(sha256Pattern, "checksumSha256 must be a valid SHA-256 hex value")
  .transform((value) => value.toLowerCase());

/**
 * Validate MIME type values.
 */
export const mimeTypeSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(mimeTypePattern, "mimeType must be a valid MIME type");

/**
 * Validate and transform file size values into BigInt.
 */
export const sizeBytesSchema = z
  .union([
    z.number().int().positive().safe(),
    z.string().trim().regex(positiveIntegerPattern),
  ])
  .transform((value) => BigInt(value));
