/**
 * Minimal valid environment variables for Jest and e2e tests.
 */
const testEnv = {
  NODE_ENV: "test",
  PORT: "3000",
  DATABASE_URL:
    "postgresql://rag_kbs:rag_kbs_password@localhost:5432/rag_kbs_test",
  REDIS_HOST: "localhost",
  REDIS_PORT: "6379",
  REDIS_PASSWORD: "",
  QDRANT_URL: "http://localhost:6333",
  QDRANT_API_KEY: "",
  QDRANT_COLLECTION: "rag_kbs_test",
  STORAGE_DRIVER: "local",
  LOCAL_STORAGE_PATH: "./storage-test",
  S3_ENDPOINT: "",
  S3_REGION: "",
  S3_BUCKET: "",
  S3_ACCESS_KEY_ID: "",
  S3_SECRET_ACCESS_KEY: "",
  S3_FORCE_PATH_STYLE: "false",
  EMBEDDING_PROVIDER: "openai",
  EMBEDDING_MODEL: "text-embedding-3-small",
  EMBEDDING_DIMENSION: "1536",
  EMBEDDING_API_KEY: "test-placeholder",
  MAX_UPLOAD_SIZE_MB: "50",
  INGESTION_QUEUE_NAME: "ingestion",
  INGESTION_CONCURRENCY: "2",
  BULLMQ_QUEUE_PREFIX: "rag-kbs-test",
  LOG_LEVEL: "error",
  WORKER_READY_FILE: "/tmp/rag-kbs-worker.ready",
} as const;

for (const [key, value] of Object.entries(testEnv)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}
