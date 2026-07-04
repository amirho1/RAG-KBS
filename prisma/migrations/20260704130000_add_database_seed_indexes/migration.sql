-- AddIndex
CREATE UNIQUE INDEX "knowledge_bases_tenantId_name_key" ON "knowledge_bases"("tenantId", "name");

-- AddIndex
CREATE INDEX "knowledge_bases_createdAt_idx" ON "knowledge_bases"("createdAt");

-- AddIndex
CREATE UNIQUE INDEX "sources_tenantId_knowledgeBaseId_name_key" ON "sources"("tenantId", "knowledgeBaseId", "name");

-- AddIndex
CREATE INDEX "sources_createdAt_idx" ON "sources"("createdAt");

-- AddIndex
CREATE INDEX "storage_objects_createdAt_idx" ON "storage_objects"("createdAt");

-- AddIndex
CREATE INDEX "document_files_createdAt_idx" ON "document_files"("createdAt");

-- AddIndex
CREATE INDEX "tags_createdAt_idx" ON "tags"("createdAt");

-- AddIndex
CREATE INDEX "parsed_documents_createdAt_idx" ON "parsed_documents"("createdAt");

-- AddIndex
CREATE INDEX "chunking_configs_createdAt_idx" ON "chunking_configs"("createdAt");

-- AddIndex
CREATE INDEX "document_chunks_createdAt_idx" ON "document_chunks"("createdAt");

-- AddIndex
CREATE INDEX "embedding_models_createdAt_idx" ON "embedding_models"("createdAt");

-- AddIndex
CREATE INDEX "embedding_configs_createdAt_idx" ON "embedding_configs"("createdAt");

-- AddIndex
CREATE INDEX "qdrant_collections_createdAt_idx" ON "qdrant_collections"("createdAt");

-- AddIndex
CREATE INDEX "chunk_embeddings_createdAt_idx" ON "chunk_embeddings"("createdAt");

-- AddIndex
CREATE INDEX "ingestion_attempts_createdAt_idx" ON "ingestion_attempts"("createdAt");

-- AddIndex
CREATE INDEX "retrieval_results_createdAt_idx" ON "retrieval_results"("createdAt");
