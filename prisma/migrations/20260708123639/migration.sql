-- AlterTable
ALTER TABLE "retrieval_queries" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "retrieval_results" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "document_chunks_parsedDocumentId_chunkingConfigId_contentHash_k" RENAME TO "document_chunks_parsedDocumentId_chunkingConfigId_contentHa_key";
