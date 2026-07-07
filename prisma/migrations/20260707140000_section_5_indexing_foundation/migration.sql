-- Add Section 5 chunking metadata without changing existing ingestion history.
ALTER TABLE "chunking_configs"
ADD COLUMN "preserveParagraphs" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "chunking_configs_deletedAt_idx" ON "chunking_configs"("deletedAt");

CREATE UNIQUE INDEX "document_chunks_parsedDocumentId_chunkingConfigId_contentHash_key"
ON "document_chunks"("parsedDocumentId", "chunkingConfigId", "contentHash");
