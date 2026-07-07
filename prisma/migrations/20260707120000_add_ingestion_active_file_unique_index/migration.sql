CREATE UNIQUE INDEX "ingestion_jobs_active_file_key"
  ON "ingestion_jobs"("tenantId", "fileId")
  WHERE "deletedAt" IS NULL
    AND "fileId" IS NOT NULL
    AND "status" IN ('PENDING', 'QUEUED', 'PROCESSING', 'RETRYING');
