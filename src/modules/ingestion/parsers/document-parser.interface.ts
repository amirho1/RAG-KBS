export type ParserSupportInput = {
  mimeType: string;
  extension?: string | null;
};

export type ParseDocumentInput = {
  buffer: Buffer;
  mimeType: string;
  originalName?: string | null;
};

export type ParsedDocumentOutput = {
  text: string;
  title?: string;
  language?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Parser contract for document extraction implementations.
 */
export interface DocumentParser {
  parserName: string;
  parserVersion: string;

  /**
   * Check whether this parser supports the input file.
   * @param input - File support metadata.
   * @returns True when this parser can parse the file.
   */
  supports(input: ParserSupportInput): boolean;

  /**
   * Parse a document into extracted text and safe metadata.
   * @param input - Parse input.
   * @returns Parsed document output.
   */
  parse(input: ParseDocumentInput): Promise<ParsedDocumentOutput>;
}
