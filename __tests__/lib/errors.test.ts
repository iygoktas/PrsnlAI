/**
 * Tests for src/lib/errors.ts
 */
import {
  IngestionError,
  SearchError,
  EmbeddingError,
} from '@/lib/errors';

describe('error classes', () => {
  describe('IngestionError', () => {
    it('creates an error with message and default code', () => {
      const error = new IngestionError('Test ingestion failed');
      expect(error.message).toBe('Test ingestion failed');
      expect(error.code).toBe('UNKNOWN');
      expect(error.name).toBe('IngestionError');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof IngestionError).toBe(true);
    });

    it('creates an error with custom code', () => {
      const error = new IngestionError('URL unreachable', 'URL_NOT_FOUND');
      expect(error.message).toBe('URL unreachable');
      expect(error.code).toBe('URL_NOT_FOUND');
      expect(error.name).toBe('IngestionError');
    });

    it('can be caught and identified', () => {
      try {
        throw new IngestionError('PDF parsing failed', 'INVALID_PDF');
      } catch (e) {
        expect(e instanceof IngestionError).toBe(true);
        expect((e as IngestionError).code).toBe('INVALID_PDF');
      }
    });
  });

  describe('SearchError', () => {
    it('creates an error with message and default code', () => {
      const error = new SearchError('Search operation failed');
      expect(error.message).toBe('Search operation failed');
      expect(error.code).toBe('UNKNOWN');
      expect(error.name).toBe('SearchError');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof SearchError).toBe(true);
    });

    it('creates an error with custom code', () => {
      const error = new SearchError('Vector DB unavailable', 'DB_CONNECTION_ERROR');
      expect(error.message).toBe('Vector DB unavailable');
      expect(error.code).toBe('DB_CONNECTION_ERROR');
      expect(error.name).toBe('SearchError');
    });

    it('can be caught and identified', () => {
      try {
        throw new SearchError('Answer generation timeout', 'LLM_TIMEOUT');
      } catch (e) {
        expect(e instanceof SearchError).toBe(true);
        expect((e as SearchError).code).toBe('LLM_TIMEOUT');
      }
    });
  });

  describe('EmbeddingError', () => {
    it('creates an error with message and default code', () => {
      const error = new EmbeddingError('Embedding operation failed');
      expect(error.message).toBe('Embedding operation failed');
      expect(error.code).toBe('UNKNOWN');
      expect(error.name).toBe('EmbeddingError');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof EmbeddingError).toBe(true);
    });

    it('creates an error with custom code', () => {
      const error = new EmbeddingError(
        'OpenAI API rate limited',
        'RATE_LIMIT'
      );
      expect(error.message).toBe('OpenAI API rate limited');
      expect(error.code).toBe('RATE_LIMIT');
      expect(error.name).toBe('EmbeddingError');
    });

    it('can be caught and identified', () => {
      try {
        throw new EmbeddingError('Model not found', 'MODEL_NOT_FOUND');
      } catch (e) {
        expect(e instanceof EmbeddingError).toBe(true);
        expect((e as EmbeddingError).code).toBe('MODEL_NOT_FOUND');
      }
    });
  });

  it('errors are distinguishable from each other', () => {
    const ingestionErr = new IngestionError('test');
    const searchErr = new SearchError('test');
    const embeddingErr = new EmbeddingError('test');

    expect(ingestionErr instanceof IngestionError).toBe(true);
    expect(ingestionErr instanceof SearchError).toBe(false);
    expect(ingestionErr instanceof EmbeddingError).toBe(false);

    expect(searchErr instanceof SearchError).toBe(true);
    expect(searchErr instanceof IngestionError).toBe(false);
    expect(searchErr instanceof EmbeddingError).toBe(false);

    expect(embeddingErr instanceof EmbeddingError).toBe(true);
    expect(embeddingErr instanceof IngestionError).toBe(false);
    expect(embeddingErr instanceof SearchError).toBe(false);
  });
});
