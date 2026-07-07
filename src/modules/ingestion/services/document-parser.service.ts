import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { createHash } from "node:crypto";
import ingestionConfig from "../../../config/ingestion.config.js";
import {
  createNonRetryableIngestionError,
  createRetryableIngestionError,
} from "../ingestion.types.js";
import { MarkdownParser } from "../parsers/markdown.parser.js";
import type { DocumentParser } from "../parsers/document-parser.interface.js";
import { TextParser } from "../parsers/text.parser.js";

export type ParsedDocumentResult = {
  parserName: string;
  parserVersion: string;
  mimeType: string;
  title?: string;
  language?: string;
  text: string;
  extractedText: string | null;
  textPreview: string;
  contentHash: string;
  charCount: number;
  textBytes: number;
  metadata: Record<string, unknown>;
};

/**
 * Selects parsers and normalizes parsed document output.
 */
@Injectable()
export class DocumentParserService {
  private readonly parsers: DocumentParser[];

  constructor(
    private readonly textParser: TextParser,
    private readonly markdownParser: MarkdownParser,
    @Inject(ingestionConfig.KEY)
    private readonly ingestion: ConfigType<typeof ingestionConfig>
  ) {
    this.parsers = [textParser, markdownParser];
  }

  /**
   * Ensure a MIME type is supported by this ingestion milestone.
   * @param mimeType - MIME type to validate.
   */
  ensureMimeTypeIsSupported(mimeType: string): void {
    this.getParserForMimeType(mimeType);
  }

  /**
   * Get the parser that supports a MIME type.
   * @param mimeType - MIME type to parse.
   * @returns Matching document parser.
   */
  getParserForMimeType(mimeType: string): DocumentParser {
    const normalizedMimeType = normalizeMimeType(mimeType);
    const parser = this.parsers.find((candidate) =>
      candidate.supports({ mimeType: normalizedMimeType })
    );

    if (!parser) {
      throw createNonRetryableIngestionError(
        "UNSUPPORTED_MIME_TYPE",
        "This file type is not supported by the current ingestion pipeline.",
        { mimeType: normalizedMimeType }
      );
    }

    return parser;
  }

  /**
   * Parse a file buffer with the supported parser.
   * @param input - Parse input.
   * @returns Normalized parsed document result.
   */
  async parse(input: {
    buffer: Buffer;
    mimeType: string;
    originalName?: string | null;
  }): Promise<ParsedDocumentResult> {
    const mimeType = normalizeMimeType(input.mimeType);
    const parser = this.getParserForMimeType(mimeType);

    try {
      const parsedDocument = await parser.parse({
        buffer: input.buffer,
        mimeType,
        originalName: input.originalName,
      });
      const text = normalizeParsedText(parsedDocument.text);

      if (text.length === 0) {
        throw createNonRetryableIngestionError(
          "EMPTY_DOCUMENT",
          "The parsed document did not contain any text."
        );
      }

      const textBytes = Buffer.byteLength(text, "utf8");
      const shouldStoreFullText =
        textBytes <= this.ingestion.maxTextContentBytes;
      const textPreview = createTextPreview(
        text,
        this.ingestion.textPreviewLength
      );

      return {
        parserName: parser.parserName,
        parserVersion: parser.parserVersion,
        mimeType,
        title: parsedDocument.title,
        language: parsedDocument.language,
        text,
        extractedText: shouldStoreFullText ? text : null,
        textPreview,
        contentHash: calculateTextHash(text),
        charCount: text.length,
        textBytes,
        metadata: {
          ...(parsedDocument.metadata ?? {}),
          textBytes,
          fullTextStored: shouldStoreFullText,
          truncatedByMaxTextContentBytes: !shouldStoreFullText,
        },
      };
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "EMPTY_DOCUMENT"
      ) {
        throw error;
      }

      throw createRetryableIngestionError(
        "PARSER_FAILED",
        "The document parser failed while extracting text."
      );
    }
  }
}

/**
 * Normalize a MIME type for parser matching.
 * @param mimeType - Raw MIME type.
 * @returns Normalized MIME type.
 */
function normalizeMimeType(mimeType: string): string {
  return (mimeType.split(";")[0] ?? "").trim().toLowerCase();
}

/**
 * Normalize parsed text without destroying document structure.
 * @param text - Raw parsed text.
 * @returns Normalized text.
 */
export function normalizeParsedText(text: string): string {
  return text
    .replace(/\uFEFF/g, "")
    .replace(/\r\n?/g, "\n")
    .split("")
    .filter(isUsefulTextCharacter)
    .join("")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Check whether a character should be retained in normalized text.
 * @param character - Single text character.
 * @returns True when the character is useful document text.
 */
function isUsefulTextCharacter(character: string): boolean {
  const code = character.charCodeAt(0);

  return (
    code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)
  );
}

/**
 * Create a safe text preview.
 * @param text - Normalized parsed text.
 * @param maxLength - Maximum preview length.
 * @returns Text preview.
 */
export function createTextPreview(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength).trimEnd();
}

/**
 * Calculate the SHA-256 hash of normalized text.
 * @param text - Normalized text.
 * @returns SHA-256 content hash.
 */
export function calculateTextHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
