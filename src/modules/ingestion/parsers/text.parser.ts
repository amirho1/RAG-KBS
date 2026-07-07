import { Injectable } from "@nestjs/common";
import {
  supportedTextMimeTypes,
  textParserName,
  textParserVersion,
} from "../ingestion.constants.js";
import type {
  DocumentParser,
  ParseDocumentInput,
  ParsedDocumentOutput,
  ParserSupportInput,
} from "./parser.interface.js";

/**
 * Plain text document parser.
 */
@Injectable()
export class TextParser implements DocumentParser {
  parserName = textParserName;
  parserVersion = textParserVersion;

  /**
   * Check whether the MIME type is plain text.
   * @param input - File support metadata.
   * @returns True when the file is plain text.
   */
  supports(input: ParserSupportInput): boolean {
    return supportedTextMimeTypes.includes(
      input.mimeType.toLowerCase() as (typeof supportedTextMimeTypes)[number]
    );
  }

  /**
   * Parse a plain text file.
   * @param input - Parse input.
   * @returns Parsed text output.
   */
  parse(input: ParseDocumentInput): Promise<ParsedDocumentOutput> {
    const text = input.buffer.toString("utf8");

    return Promise.resolve({
      text,
      title: getFirstTextLine(text),
      metadata: {
        parser: this.parserName,
      },
    });
  }
}

/**
 * Get the first non-empty text line as a safe title hint.
 * @param text - Extracted text.
 * @returns First line title when available.
 */
function getFirstTextLine(text: string): string | undefined {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return firstLine ? firstLine.slice(0, 512) : undefined;
}
