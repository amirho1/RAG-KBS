import { Injectable } from "@nestjs/common";
import {
  markdownParserName,
  markdownParserVersion,
  supportedMarkdownMimeTypes,
} from "../ingestion.constants.js";
import type {
  DocumentParser,
  ParseDocumentInput,
  ParsedDocumentOutput,
  ParserSupportInput,
} from "./document-parser.interface.js";

const markdownHeadingPattern = /^#{1,6}\s+(.+)$/m;

/**
 * Markdown document parser.
 */
@Injectable()
export class MarkdownParser implements DocumentParser {
  parserName = markdownParserName;
  parserVersion = markdownParserVersion;

  /**
   * Check whether the MIME type is Markdown.
   * @param input - File support metadata.
   * @returns True when the file is Markdown.
   */
  supports(input: ParserSupportInput): boolean {
    return supportedMarkdownMimeTypes.includes(
      input.mimeType.toLowerCase() as (typeof supportedMarkdownMimeTypes)[number]
    );
  }

  /**
   * Parse Markdown while preserving the source structure.
   * @param input - Parse input.
   * @returns Parsed Markdown output.
   */
  parse(input: ParseDocumentInput): Promise<ParsedDocumentOutput> {
    const text = input.buffer.toString("utf8");

    return Promise.resolve({
      text,
      title: getMarkdownTitle(text),
      metadata: {
        parser: this.parserName,
      },
    });
  }
}

/**
 * Extract the first Markdown heading as a safe title hint.
 * @param text - Markdown text.
 * @returns Markdown title when available.
 */
function getMarkdownTitle(text: string): string | undefined {
  const match = markdownHeadingPattern.exec(text);
  const title = match?.[1]?.trim();

  return title ? title.slice(0, 512) : undefined;
}
