import { describe, expect, it } from "@jest/globals";
import { DocumentParserService } from "./document-parser.service.js";
import { MarkdownParser } from "../parsers/markdown.parser.js";
import { TextParser } from "../parsers/text.parser.js";
import { IngestionError } from "../ingestion.types.js";

/**
 * Create parser service for tests.
 * @param maxTextContentBytes - Maximum full-text bytes.
 * @param textPreviewLength - Preview length.
 * @returns Parser service.
 */
function createParserService(
  maxTextContentBytes = 1_048_576,
  textPreviewLength = 1_000
): DocumentParserService {
  return new DocumentParserService(new TextParser(), new MarkdownParser(), {
    queueName: "ingestion",
    concurrency: 3,
    maxAttempts: 3,
    backoffDelayMs: 5_000,
    removeOnCompleteCount: 1_000,
    removeOnFailCount: 5_000,
    jobTimeoutMs: 120_000,
    maxTextContentBytes,
    textPreviewLength,
    maxUploadSizeMb: 50,
  });
}

describe("DocumentParserService", () => {
  it("should parse and normalize text files", async () => {
    const service = createParserService();
    const result = await service.parse({
      buffer: Buffer.from("Title\r\n\r\n\r\nBody\u0000", "utf8"),
      mimeType: "text/plain",
      originalName: "manual.txt",
    });

    expect(result.parserName).toBe("text");
    expect(result.text).toBe("Title\n\nBody");
    expect(result.textPreview).toBe("Title\n\nBody");
    expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.extractedText).toBe(result.text);
  });

  it("should normalize MIME type case and parameters", async () => {
    const service = createParserService();
    const result = await service.parse({
      buffer: Buffer.from("Title", "utf8"),
      mimeType: "Text/Plain; charset=utf-8",
      originalName: "manual.txt",
    });

    expect(result.parserName).toBe("text");
    expect(result.mimeType).toBe("text/plain");
  });

  it("should parse Markdown and extract the first heading", async () => {
    const service = createParserService();
    const result = await service.parse({
      buffer: Buffer.from("# Guide\n\nContent", "utf8"),
      mimeType: "text/markdown",
    });

    expect(result.parserName).toBe("markdown");
    expect(result.title).toBe("Guide");
    expect(result.text).toContain("# Guide");
  });

  it("should store only preview metadata when text exceeds the limit", async () => {
    const service = createParserService(8, 5);
    const result = await service.parse({
      buffer: Buffer.from("0123456789abcdef", "utf8"),
      mimeType: "text/plain",
    });

    expect(result.extractedText).toBeNull();
    expect(result.textPreview).toBe("01234");
    expect(result.metadata.fullTextStored).toBe(false);
    expect(result.metadata.truncatedByMaxTextContentBytes).toBe(true);
  });

  it("should reject unsupported MIME types safely", () => {
    const service = createParserService();

    expect(() => service.getParserForMimeType("application/pdf")).toThrow(
      IngestionError
    );
  });

  it("should reject empty normalized documents", async () => {
    const service = createParserService();

    await expect(
      service.parse({
        buffer: Buffer.from("\u0000\r\n\t", "utf8"),
        mimeType: "text/plain",
      })
    ).rejects.toMatchObject({
      code: "EMPTY_DOCUMENT",
      retryable: false,
    });
  });
});
