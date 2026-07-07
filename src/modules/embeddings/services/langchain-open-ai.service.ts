import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import embeddingConfig from "../../../config/embedding.config.js";

/**
 * Factory for LangChain OpenAI clients used by RAG-KBS internals.
 */
@Injectable()
export class LangChainOpenAiService {
  constructor(
    @Inject(embeddingConfig.KEY)
    private readonly embedding: ConfigType<typeof embeddingConfig>
  ) {}

  /**
   * Create a LangChain OpenAI embeddings client.
   * @returns Configured OpenAI embeddings client.
   */
  createEmbeddings(): OpenAIEmbeddings<number[]> {
    return new OpenAIEmbeddings<number[]>({
      apiKey: this.embedding.apiKey,
      model: this.embedding.model,
      dimensions: this.embedding.dimension,
      batchSize: this.embedding.batchSize,
      timeout: this.embedding.timeoutMs,
      maxRetries: this.embedding.maxRetries,
    });
  }

  /**
   * Create a LangChain OpenAI chat model for future internal RAG use.
   * @returns Configured chat model.
   */
  createChatModel(): ChatOpenAI {
    return new ChatOpenAI({
      apiKey: this.embedding.apiKey,
      model: this.embedding.chatModel,
      temperature: 0,
      timeout: this.embedding.timeoutMs,
      maxRetries: this.embedding.maxRetries,
    });
  }
}
