import { Module } from "@nestjs/common";
import { PrismaModule } from "../database/prisma.module.js";
import { LocalDummyEmbeddingProvider } from "./providers/local-dummy-embedding.provider.js";
import { OpenAIEmbeddingProvider } from "./providers/openai-embedding.provider.js";
import { EmbeddingConfigService } from "./services/embedding-config.service.js";
import { EmbeddingModelService } from "./services/embedding-model.service.js";
import { EmbeddingsService } from "./services/embeddings.service.js";
import { LangChainOpenAiService } from "./services/langchain-open-ai.service.js";

/**
 * Embedding provider and model configuration module.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    LangChainOpenAiService,
    OpenAIEmbeddingProvider,
    LocalDummyEmbeddingProvider,
    EmbeddingModelService,
    EmbeddingConfigService,
    EmbeddingsService,
  ],
  exports: [
    LangChainOpenAiService,
    EmbeddingModelService,
    EmbeddingConfigService,
    EmbeddingsService,
  ],
})
export class EmbeddingsModule {}
