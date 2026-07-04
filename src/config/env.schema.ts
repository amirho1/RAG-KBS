import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "test", "production"]);

const storageDriverSchema = z.enum(["local", "s3"]);

const logFormatSchema = z.enum(["json", "pretty"]);

const positiveIntSchema = z.coerce.number().int().positive();

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
    EMBEDDING_PROVIDER: z.string().min(1, "EMBEDDING_PROVIDER is required"),
    EMBEDDING_MODEL: z.string().min(1, "EMBEDDING_MODEL is required"),
    EMBEDDING_DIMENSION: positiveIntSchema,
    EMBEDDING_API_KEY: z.string().optional().default(""),
    MAX_UPLOAD_SIZE_MB: positiveIntSchema,
    INGESTION_QUEUE_NAME: z.string().min(1, "INGESTION_QUEUE_NAME is required"),
    INGESTION_CONCURRENCY: positiveIntSchema,
    BULLMQ_QUEUE_PREFIX: z.string().optional().default("rag-kbs"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .optional()
      .default("info"),
    LOG_FORMAT: logFormatSchema.optional().default("json"),
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
  });

export type Env = z.infer<typeof envSchema>;
