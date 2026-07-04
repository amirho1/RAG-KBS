import { resetValidatedEnv } from "./validated-env.js";
import { validateEnv } from "./validate-env.js";

const baseValidEnv = {
  NODE_ENV: "development",
  PORT: "3000",
  DATABASE_URL: "postgresql://rag_kbs:rag_kbs_password@localhost:5432/rag_kbs",
  REDIS_HOST: "localhost",
  REDIS_PORT: "6379",
  REDIS_PASSWORD: "",
  QDRANT_URL: "http://localhost:6333",
  QDRANT_API_KEY: "",
  STORAGE_DRIVER: "local",
  LOCAL_STORAGE_PATH: "./storage",
  S3_ENDPOINT: "",
  S3_REGION: "",
  S3_BUCKET: "",
  S3_ACCESS_KEY_ID: "",
  S3_SECRET_ACCESS_KEY: "",
  EMBEDDING_PROVIDER: "openai",
  EMBEDDING_MODEL: "text-embedding-3-small",
  EMBEDDING_DIMENSION: "1536",
  MAX_UPLOAD_SIZE_MB: "50",
  INGESTION_QUEUE_NAME: "ingestion",
  INGESTION_CONCURRENCY: "2",
} as const;

describe("validateEnv", () => {
  beforeEach(() => {
    resetValidatedEnv();
  });

  it("should validate a local development environment", () => {
    const env = validateEnv({ ...baseValidEnv });

    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3000);
    expect(env.STORAGE_DRIVER).toBe("local");
    expect(env.LOCAL_STORAGE_PATH).toBe("./storage");
  });

  it("should validate an s3 storage environment", () => {
    const env = validateEnv({
      ...baseValidEnv,
      STORAGE_DRIVER: "s3",
      LOCAL_STORAGE_PATH: "",
      S3_ENDPOINT: "http://minio:9000",
      S3_REGION: "us-east-1",
      S3_BUCKET: "rag-kbs-development",
      S3_ACCESS_KEY_ID: "rag-kbs-minio",
      S3_SECRET_ACCESS_KEY: "rag-kbs-minio-password",
    });

    expect(env.STORAGE_DRIVER).toBe("s3");
    expect(env.S3_BUCKET).toBe("rag-kbs-development");
  });

  it("should fail when PORT is not a number", () => {
    expect(() =>
      validateEnv({
        ...baseValidEnv,
        PORT: "abc",
      })
    ).toThrow("Environment validation failed:\n- PORT:");
  });

  it("should fail when NODE_ENV is invalid", () => {
    expect(() =>
      validateEnv({
        ...baseValidEnv,
        NODE_ENV: "staging",
      })
    ).toThrow("Environment validation failed:\n- NODE_ENV:");
  });

  it("should fail when local storage path is missing", () => {
    expect(() =>
      validateEnv({
        ...baseValidEnv,
        LOCAL_STORAGE_PATH: "",
      })
    ).toThrow(
      "Environment validation failed:\n- LOCAL_STORAGE_PATH: LOCAL_STORAGE_PATH is required when STORAGE_DRIVER=local"
    );
  });

  it("should fail when s3 credentials are missing", () => {
    expect(() =>
      validateEnv({
        ...baseValidEnv,
        STORAGE_DRIVER: "s3",
        LOCAL_STORAGE_PATH: "",
      })
    ).toThrow("Environment validation failed:");
  });

  it("should derive a redis url when REDIS_URL is not provided", () => {
    const env = validateEnv({ ...baseValidEnv });

    expect(env.REDIS_URL).toBeUndefined();
  });

  it("should apply default health timeout values", () => {
    const env = validateEnv({ ...baseValidEnv });

    expect(env.POSTGRES_HEALTH_TIMEOUT_MS).toBe(2000);
    expect(env.REDIS_HEALTH_TIMEOUT_MS).toBe(2000);
    expect(env.QDRANT_HEALTH_TIMEOUT_MS).toBe(3000);
    expect(env.STORAGE_HEALTH_TIMEOUT_MS).toBe(3000);
    expect(env.QUEUE_HEALTH_TIMEOUT_MS).toBe(2000);
    expect(env.SERVICE_NAME).toBe("rag-kbs-api");
  });
});
