/**
 * Custom error class for ingestion operations (URL scraping, PDF parsing, text processing).
 */
export class IngestionError extends Error {
  code: string;

  constructor(message: string, code: string = 'UNKNOWN') {
    super(message);
    this.name = 'IngestionError';
    this.code = code;
    Object.setPrototypeOf(this, IngestionError.prototype);
  }
}

/**
 * Custom error class for search operations (embedding, vector search, answer generation).
 */
export class SearchError extends Error {
  code: string;

  constructor(message: string, code: string = 'UNKNOWN') {
    super(message);
    this.name = 'SearchError';
    this.code = code;
    Object.setPrototypeOf(this, SearchError.prototype);
  }
}

/**
 * Custom error class for embedding operations (vector generation and storage).
 */
export class EmbeddingError extends Error {
  code: string;

  constructor(message: string, code: string = 'UNKNOWN') {
    super(message);
    this.name = 'EmbeddingError';
    this.code = code;
    Object.setPrototypeOf(this, EmbeddingError.prototype);
  }
}
