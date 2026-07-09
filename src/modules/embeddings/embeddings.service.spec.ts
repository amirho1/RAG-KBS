import { describe, expect, it, jest } from "@jest/globals";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { EmbeddingProvider } from "../../generated/prisma/enums.js";
import { LocalDummyEmbeddingProvider } from "./providers/local-dummy-embedding.provider.js";
import { OpenAIEmbeddingProvider } from "./providers/openai-embedding.provider.js";
import { EmbeddingsService } from "./services/embeddings.service.js";
import { LangChainOpenAiService } from "./services/langchain-open-ai.service.js";

const embeddingConfig = {
  provider: "openai",
  model: "openai/text-embedding-3-small",
  chatModel: "deepseek/deepseek-v4-flash",
  dimension: 4,
  distanceMetric: "Cosine",
  batchSize: 2,
  timeoutMs: 30_000,
  maxRetries: 3,
  apiKey: "test-placeholder",
  baseUrl: "https://openrouter.ai/api/v1",
} as const;

describe("LangChainOpenAiService", () => {
  it("should create LangChain OpenAI clients", () => {
    const service = new LangChainOpenAiService(embeddingConfig);

    expect(service.createEmbeddings()).toBeInstanceOf(OpenAIEmbeddings);
    expect(service.createChatModel()).toBeInstanceOf(ChatOpenAI);
  });

  it("should configure OpenAI-compatible clients with the base URL", () => {
    const service = new LangChainOpenAiService(embeddingConfig);
    const embeddings = service.createEmbeddings() as OpenAIEmbeddings<
      number[]
    > & {
      clientConfig: { baseURL?: string };
    };
    const chatModel = service.createChatModel() as ChatOpenAI & {
      clientConfig: { baseURL?: string };
    };

    expect(embeddings.clientConfig.baseURL).toBe(
      "https://openrouter.ai/api/v1"
    );
    expect(chatModel.clientConfig.baseURL).toBe("https://openrouter.ai/api/v1");
  });
});

describe("embedding providers", () => {
  it("should create deterministic local dummy embeddings", async () => {
    const provider = new LocalDummyEmbeddingProvider({
      ...embeddingConfig,
      provider: "local",
    });

    const first = await provider.embedText({ text: "hello" });
    const second = await provider.embedText({ text: "hello" });

    expect(first.dimension).toBe(4);
    expect(first.vector).toEqual(second.vector);
  });

  it("should adapt LangChain OpenAI batch embeddings", async () => {
    const langChainService = {
      createEmbeddings: jest.fn(() => ({
        embedDocuments: jest.fn(() =>
          Promise.resolve([
            [1, 2, 3, 4],
            [4, 3, 2, 1],
          ])
        ),
        embedQuery: jest.fn(),
        dimensions: 4,
        model: "text-embedding-3-small",
      })),
    };
    const provider = new OpenAIEmbeddingProvider(
      langChainService as unknown as LangChainOpenAiService
    );

    const result = await provider.embedBatch({ texts: ["a", "b"] });

    expect(result.embeddings).toHaveLength(2);
    expect(result.embeddings[0].dimension).toBe(4);
  });

  it("should validate embedding dimensions", async () => {
    const openAiProvider = {
      embedBatch: jest.fn(() =>
        Promise.resolve({
          embeddings: [{ vector: [1, 2], dimension: 2 }],
        })
      ),
    };
    const localProvider = new LocalDummyEmbeddingProvider(embeddingConfig);
    const service = new EmbeddingsService(
      openAiProvider as never,
      localProvider,
      embeddingConfig
    );

    await expect(
      service.embedBatch(["hello"], 4, EmbeddingProvider.OPENAI)
    ).rejects.toThrow("EMBEDDING_DIMENSION_MISMATCH");
  });
});
