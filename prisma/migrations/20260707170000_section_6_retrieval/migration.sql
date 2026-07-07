-- Add Section 6 retrieval traceability fields without storing vectors.
ALTER TABLE "retrieval_queries"
ADD COLUMN "embeddingConfigId" UUID,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "retrieval_results"
ADD COLUMN "tenantId" VARCHAR(128),
ADD COLUMN "sourceId" UUID,
ADD COLUMN "fileId" UUID,
ADD COLUMN "metadata" JSONB,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "retrieval_results"
SET "tenantId" = "retrieval_queries"."tenantId"
FROM "retrieval_queries"
WHERE "retrieval_results"."retrievalQueryId" = "retrieval_queries"."id";

ALTER TABLE "retrieval_results"
ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "retrieval_queries"
ADD CONSTRAINT "retrieval_queries_embeddingConfigId_fkey"
FOREIGN KEY ("embeddingConfigId") REFERENCES "embedding_configs"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "retrieval_queries_embeddingConfigId_idx" ON "retrieval_queries"("embeddingConfigId");
CREATE INDEX "retrieval_results_tenantId_idx" ON "retrieval_results"("tenantId");
CREATE INDEX "retrieval_results_sourceId_idx" ON "retrieval_results"("sourceId");
CREATE INDEX "retrieval_results_fileId_idx" ON "retrieval_results"("fileId");
