import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "test", "production"]);

const storageDriverSchema = z.enum(["local", "s3"]);

const logFormatSchema = z.enum(["json", "pretty"]);

const embeddingProviderSchema = z.enum([
  "openai",
  "azure-openai",
  "azure_openai",
  "anthropic",
  "google",
  "cohere",
  "voyage",
  "mistral",
  "huggingface",
  "ollama",
  "local",
  "custom",
]);

const distanceMetricSchema = z.enum([
  "Cosine",
  "Dot",
  "Euclid",
  "Manhattan",
  "COSINE",
  "DOT",
  "EUCLID",
  "MANHATTAN",
  "cosine",
  "dot",
  "euclid",
  "manhattan",
]);

const positiveIntSchema = z.coerce.number().int().positive();
const nonNegativeNumberSchema = z.coerce.number().finite().min(0);
const uploadMimeTypePattern =
  /^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*$/;

/**
 * Split and validate comma-separated upload MIME type values.
 * @param value - Raw comma-separated environment value.
 * @returns Normalized MIME type allowlist.
 */
function parseAllowedUploadMimeTypes(value: string): string[] {
  return value
    .split(",")
    .map((mimeType) => mimeType.trim().toLowerCase())
    .filter((mimeType) => mimeType.length > 0);
}

/**
 * Check whether every MIME type in the allowlist has a valid shape.
 * @param mimeTypes - MIME type allowlist.
 * @returns True when every MIME type is valid.
 */
function isAllowedUploadMimeTypesValue(mimeTypes: string[]): boolean {
  return mimeTypes.every((mimeType) => uploadMimeTypePattern.test(mimeType));
}

const allowedUploadMimeTypesSchema = z
  .string()
  .trim()
  .min(1, "ALLOWED_UPLOAD_MIME_TYPES is required")
  .transform(parseAllowedUploadMimeTypes)
  .refine((mimeTypes) => mimeTypes.length > 0, {
    message: "ALLOWED_UPLOAD_MIME_TYPES must include at least one MIME type",
  })
  .refine(isAllowedUploadMimeTypesValue, {
    message: "ALLOWED_UPLOAD_MIME_TYPES contains an invalid MIME type",
  });

/**
 * Create a boolean env schema from true/false strings.
 * @param defaultValue - Default boolean value.
 * @returns A boolean env schema.
 */
function createBooleanStringSchema(defaultValue: boolean) {
  return z
    .enum(["true", "false"])
    .optional()
    .default(defaultValue ? "true" : "false")
    .transform((value) => value === "true");
}

/**
 * Master environment variable schema for RAG-KBS.
 */
export const envSchema = z
  .object({
    NODE_ENV: nodeEnvSchema,
    PORT: positiveIntSchema,
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DEFAULT_TENANT_ID: z.string().optional().default("default"),
    REDIS_HOST: z.string().min(1, "REDIS_HOST is required"),
    REDIS_PORT: positiveIntSchema,
    REDIS_PASSWORD: z.string().optional().default(""),
    REDIS_URL: z.string().optional(),
    QDRANT_URL: z.string().min(1, "QDRANT_URL is required"),
    QDRANT_API_KEY: z.string().default(""),
    QDRANT_COLLECTION: z.string().optional().default("rag_kbs"),
    QDRANT_COLLECTION_NAME: z.string().optional(),
    QDRANT_VECTOR_SIZE: positiveIntSchema.optional(),
    QDRANT_DISTANCE_METRIC: distanceMetricSchema.optional().default("Cosine"),
    QDRANT_UPSERT_BATCH_SIZE: positiveIntSchema.optional().default(64),
    QDRANT_TIMEOUT_MS: positiveIntSchema.optional().default(30_000),
    STORAGE_DRIVER: storageDriverSchema,
    LOCAL_STORAGE_PATH: z.string().optional().default(""),
    S3_ENDPOINT: z.string().optional().default(""),
    S3_REGION: z.string().optional().default(""),
    S3_BUCKET: z.string().optional().default(""),
    S3_ACCESS_KEY_ID: z.string().optional().default(""),
    S3_SECRET_ACCESS_KEY: z.string().optional().default(""),
    S3_FORCE_PATH_STYLE: z
      .enum(["true", "false"])
      .optional()
      .default("false")
      .transform((value) => value === "true"),
    ALLOWED_UPLOAD_MIME_TYPES: allowedUploadMimeTypesSchema,
    CHUNKING_DEFAULT_SIZE: positiveIntSchema.optional().default(800),
    CHUNKING_DEFAULT_OVERLAP: z.coerce
      .number()
      .int()
      .min(0)
      .optional()
      .default(120),
    CHUNKING_TEXT_PREVIEW_LENGTH: positiveIntSchema.optional().default(1_000),
    CHUNKING_MAX_CHUNKS_PER_DOCUMENT: positiveIntSchema
      .optional()
      .default(10_000),
    EMBEDDING_PROVIDER: embeddingProviderSchema,
    EMBEDDING_MODEL: z.string().min(1, "EMBEDDING_MODEL is required"),
    EMBEDDING_DIMENSION: positiveIntSchema,
    EMBEDDING_DISTANCE_METRIC: distanceMetricSchema
      .optional()
      .default("Cosine"),
    EMBEDDING_BATCH_SIZE: positiveIntSchema.optional().default(64),
    EMBEDDING_TIMEOUT_MS: positiveIntSchema.optional().default(30_000),
    EMBEDDING_MAX_RETRIES: z.coerce.number().int().min(0).optional().default(3),
    EMBEDDING_API_KEY: z.string().optional().default(""),
    OPENAI_API_KEY: z.string().optional().default(""),
    OPENAI_CHAT_MODEL: z
      .string()
      .trim()
      .min(1)
      .optional()
      .default("gpt-4o-mini"),
    RETRIEVAL_DEFAULT_TOP_K: positiveIntSchema.optional().default(8),
    RETRIEVAL_MAX_TOP_K: positiveIntSchema.optional().default(30),
    RETRIEVAL_DEFAULT_SCORE_THRESHOLD: nonNegativeNumberSchema
      .optional()
      .default(0),
    RETRIEVAL_TIMEOUT_MS: positiveIntSchema.optional().default(30_000),
    RETRIEVAL_STORE_QUERY_TEXT: createBooleanStringSchema(true),
    RETRIEVAL_STORE_RESULTS: createBooleanStringSchema(true),
    RETRIEVAL_INCLUDE_TEXT_DEFAULT: createBooleanStringSchema(true),
    RETRIEVAL_INCLUDE_METADATA_DEFAULT: createBooleanStringSchema(true),
    MAX_UPLOAD_SIZE_MB: positiveIntSchema,
    INGESTION_QUEUE_NAME: z.string().min(1, "INGESTION_QUEUE_NAME is required"),
    INGESTION_CONCURRENCY: positiveIntSchema,
    INGESTION_MAX_ATTEMPTS: positiveIntSchema,
    INGESTION_BACKOFF_DELAY_MS: positiveIntSchema,
    INGESTION_REMOVE_ON_COMPLETE_COUNT: positiveIntSchema,
    INGESTION_REMOVE_ON_FAIL_COUNT: positiveIntSchema,
    INGESTION_JOB_TIMEOUT_MS: positiveIntSchema,
    INGESTION_MAX_TEXT_CONTENT_BYTES: positiveIntSchema,
    INGESTION_TEXT_PREVIEW_LENGTH: positiveIntSchema,
    BULLMQ_QUEUE_PREFIX: z.string().optional().default("rag-kbs"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .optional()
      .default("info"),
    LOG_FORMAT: logFormatSchema.optional().default("json"),
    LOG_DIR: z.string().trim().min(1).optional().default("logs"),
    LOG_ROTATION_ENABLED: createBooleanStringSchema(true),
    LOG_RETENTION_DAYS: positiveIntSchema.optional().default(14),
    REQUEST_LOGGING_ENABLED: createBooleanStringSchema(true),
    REQUEST_BODY_LOGGING_ENABLED: createBooleanStringSchema(false),
    WORKER_READY_FILE: z
      .string()
      .optional()
      .default("/tmp/rag-kbs-worker.ready"),
    SERVICE_NAME: z.string().optional().default("rag-kbs-api"),
    APP_VERSION: z.string().optional().default(""),
    POSTGRES_HEALTH_TIMEOUT_MS: positiveIntSchema.optional().default(2000),
    REDIS_HEALTH_TIMEOUT_MS: positiveIntSchema.optional().default(2000),
    QDRANT_HEALTH_TIMEOUT_MS: positiveIntSchema.optional().default(3000),
    STORAGE_HEALTH_TIMEOUT_MS: positiveIntSchema.optional().default(3000),
    QUEUE_HEALTH_TIMEOUT_MS: positiveIntSchema.optional().default(2000),
  })
  .superRefine((data, context) => {
    if (
      data.STORAGE_DRIVER === "local" &&
      data.LOCAL_STORAGE_PATH.trim() === ""
    ) {
      context.addIssue({
        code: "custom",
        message: "LOCAL_STORAGE_PATH is required when STORAGE_DRIVER=local",
        path: ["LOCAL_STORAGE_PATH"],
      });
    }

    if (data.STORAGE_DRIVER === "s3") {
      const s3Fields = [
        { key: "S3_ENDPOINT", value: data.S3_ENDPOINT },
        { key: "S3_REGION", value: data.S3_REGION },
        { key: "S3_BUCKET", value: data.S3_BUCKET },
        { key: "S3_ACCESS_KEY_ID", value: data.S3_ACCESS_KEY_ID },
        { key: "S3_SECRET_ACCESS_KEY", value: data.S3_SECRET_ACCESS_KEY },
      ] as const;

      for (const field of s3Fields) {
        if (field.value.trim() === "") {
          context.addIssue({
            code: "custom",
            message: `${field.key} is required when STORAGE_DRIVER=s3`,
            path: [field.key],
          });
        }
      }
    }

    if (
      data.EMBEDDING_PROVIDER === "openai" &&
      data.OPENAI_API_KEY.trim() === "" &&
      data.EMBEDDING_API_KEY.trim() === ""
    ) {
      context.addIssue({
        code: "custom",
        message:
          "OPENAI_API_KEY or EMBEDDING_API_KEY is required when EMBEDDING_PROVIDER=openai",
        path: ["OPENAI_API_KEY"],
      });
    }

    const qdrantVectorSize =
      data.QDRANT_VECTOR_SIZE ?? data.EMBEDDING_DIMENSION;

    if (qdrantVectorSize !== data.EMBEDDING_DIMENSION) {
      context.addIssue({
        code: "custom",
        message:
          "QDRANT_VECTOR_SIZE must match EMBEDDING_DIMENSION for the default collection",
        path: ["QDRANT_VECTOR_SIZE"],
      });
    }

    if (data.RETRIEVAL_DEFAULT_TOP_K > data.RETRIEVAL_MAX_TOP_K) {
      context.addIssue({
        code: "custom",
        message:
          "RETRIEVAL_DEFAULT_TOP_K must be less than or equal to RETRIEVAL_MAX_TOP_K",
        path: ["RETRIEVAL_DEFAULT_TOP_K"],
      });
    }
  });

export type Env = z.infer<typeof envSchema>;
