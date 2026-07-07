-- AlterTable
ALTER TABLE "parsed_documents"
  ADD COLUMN "storageObjectId" UUID,
  ADD COLUMN "mimeType" VARCHAR(255),
  ADD COLUMN "metadata" JSONB;

-- AlterTable
ALTER TABLE "ingestion_jobs"
  ADD COLUMN "force" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reason" VARCHAR(128),
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Replace the global idempotency unique index with active-job uniqueness.
DROP INDEX IF EXISTS "ingestion_jobs_idempotencyKey_key";

CREATE INDEX "parsed_documents_storageObjectId_idx"
  ON "parsed_documents"("storageObjectId");

CREATE INDEX "ingestion_jobs_idempotencyKey_idx"
  ON "ingestion_jobs"("idempotencyKey");

CREATE INDEX "ingestion_jobs_deletedAt_idx"
  ON "ingestion_jobs"("deletedAt");

CREATE UNIQUE INDEX "ingestion_jobs_active_idempotencyKey_key"
  ON "ingestion_jobs"("idempotencyKey")
  WHERE "deletedAt" IS NULL
    AND "status" IN ('PENDING', 'QUEUED', 'PROCESSING', 'RETRYING');

-- AddForeignKey
ALTER TABLE "parsed_documents"
  ADD CONSTRAINT "parsed_documents_storageObjectId_fkey"
  FOREIGN KEY ("storageObjectId")
  REFERENCES "storage_objects"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
