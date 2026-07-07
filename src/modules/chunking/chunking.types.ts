export type ChunkingConfigRecord = {
  id: string;
  tenantId: string;
  name: string;
  strategy: string;
  chunkSize: number;
  chunkOverlap: number;
  tokenizer?: string | null;
  preserveHeadings: boolean;
  preserveParagraphs?: boolean | null;
  metadata?: unknown;
};

export type ChunkTextInput = {
  parsedDocumentId: string;
  text: string;
  config: ChunkingConfigRecord;
  textPreviewLength: number;
  maxChunksPerDocument: number;
};

export type ChunkTextResult = {
  chunkIndex: number;
  text: string;
  textPreview: string;
  tokenCount: number;
  charStart: number;
  charEnd: number;
  headingPath: string[];
  contentHash: string;
};
