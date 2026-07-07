export type EmbedTextInput = {
  text: string;
};

export type EmbedBatchInput = {
  texts: string[];
};

export type EmbeddingResult = {
  vector: number[];
  dimension: number;
};

export type EmbeddingBatchResult = {
  embeddings: EmbeddingResult[];
};
