// Mock all sub-modules before importing ingest
jest.mock('@/ingestion/text', () => ({
  ingestText: jest.fn(),
}));

jest.mock('@/ingestion/pdf', () => ({
  ingestPdf: jest.fn(),
}));

jest.mock('@/ingestion/url', () => ({
  ingestUrl: jest.fn(),
}));

jest.mock('@/embedding/chunker', () => ({
  chunk: jest.fn(),
}));

jest.mock('@/embedding/index', () => ({
  embed: jest.fn(),
}));

jest.mock('@/storage/index', () => ({
  saveDocument: jest.fn(),
}));

import { ingest, IngestionInput } from '@/ingestion/index';
import { ingestText } from '@/ingestion/text';
import { ingestPdf } from '@/ingestion/pdf';
import { ingestUrl } from '@/ingestion/url';
import { chunk } from '@/embedding/chunker';
import { embed } from '@/embedding/index';
import { saveDocument } from '@/storage/index';

describe('ingestion/index (orchestrator)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ingest()', () => {
    it('should ingest plain text end-to-end', async () => {
      const input: IngestionInput = {
        type: 'text',
        content: 'This is test content with enough words to be valid for processing',
      };

      (ingestText as jest.Mock).mockReturnValueOnce({
        title: 'Untitled',
        content: 'This is test content with enough words to be valid for processing',
        type: 'TEXT',
      });

      (chunk as jest.Mock).mockReturnValueOnce([
        {
          content: 'This is test content',
          chunkIndex: 0,
          tokenEstimate: 4,
        },
      ]);

      (embed as jest.Mock).mockResolvedValueOnce([[0.1, 0.2, 0.3]]);

      (saveDocument as jest.Mock).mockResolvedValueOnce('src-123');

      const result = await ingest(input);

      expect(result.sourceId).toBe('src-123');
      expect(result.chunksCreated).toBe(1);
      expect(result.title).toBe('Untitled');
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(ingestText).toHaveBeenCalledWith('This is test content with enough words to be valid for processing');
    });

    it('should ingest PDF end-to-end', async () => {
      const buffer = Buffer.from('fake pdf');
      const input: IngestionInput = {
        type: 'pdf',
        file: buffer,
        title: 'Custom Title',
      };

      (ingestPdf as jest.Mock).mockResolvedValueOnce({
        title: 'Original PDF Title',
        content: 'PDF content with enough words to be valid for processing',
        type: 'PDF',
        pageCount: 1,
      });

      (chunk as jest.Mock).mockReturnValueOnce([
        {
          content: 'PDF content',
          chunkIndex: 0,
          tokenEstimate: 2,
        },
      ]);

      (embed as jest.Mock).mockResolvedValueOnce([[0.4, 0.5, 0.6]]);

      (saveDocument as jest.Mock).mockResolvedValueOnce('src-pdf-123');

      const result = await ingest(input);

      expect(result.sourceId).toBe('src-pdf-123');
      expect(result.title).toBe('Custom Title'); // Uses override
      expect(ingestPdf).toHaveBeenCalledWith(buffer, 'Custom Title');
    });

    it('should ingest URL end-to-end', async () => {
      const input: IngestionInput = {
        type: 'url',
        url: 'https://example.com/article',
      };

      (ingestUrl as jest.Mock).mockResolvedValueOnce({
        title: 'Example Article',
        content: 'Article content with enough words to be valid for processing',
        type: 'URL',
        url: 'https://example.com/article',
      });

      (chunk as jest.Mock).mockReturnValueOnce([
        {
          content: 'Article content',
          chunkIndex: 0,
          tokenEstimate: 2,
        },
      ]);

      (embed as jest.Mock).mockResolvedValueOnce([[0.7, 0.8, 0.9]]);

      (saveDocument as jest.Mock).mockResolvedValueOnce('src-url-123');

      const result = await ingest(input);

      expect(result.sourceId).toBe('src-url-123');
      expect(result.title).toBe('Example Article');
      expect(ingestUrl).toHaveBeenCalledWith('https://example.com/article');
    });

    it('should throw on invalid input', async () => {
      const input: any = {};

      await expect(ingest(input)).rejects.toThrow(
        expect.objectContaining({
          code: 'INVALID_INPUT',
        }),
      );
    });

    it('should throw if URL input missing url field', async () => {
      const input: IngestionInput = {
        type: 'url',
      };

      await expect(ingest(input)).rejects.toThrow(
        expect.objectContaining({
          code: 'MISSING_URL',
        }),
      );
    });

    it('should throw if PDF input missing file buffer', async () => {
      const input: IngestionInput = {
        type: 'pdf',
      };

      await expect(ingest(input)).rejects.toThrow(
        expect.objectContaining({
          code: 'MISSING_FILE',
        }),
      );
    });

    it('should throw if text input missing content', async () => {
      const input: IngestionInput = {
        type: 'text',
      };

      await expect(ingest(input)).rejects.toThrow(
        expect.objectContaining({
          code: 'MISSING_CONTENT',
        }),
      );
    });

    it('should throw on unknown ingestion type', async () => {
      const input: any = {
        type: 'unknown',
        content: 'test',
      };

      await expect(ingest(input)).rejects.toThrow(
        expect.objectContaining({
          code: 'UNKNOWN_TYPE',
        }),
      );
    });

    it('should throw if no chunks generated', async () => {
      const input: IngestionInput = {
        type: 'text',
        content: 'Short',
      };

      (ingestText as jest.Mock).mockReturnValueOnce({
        title: 'Short',
        content: 'Short',
        type: 'TEXT',
      });

      (chunk as jest.Mock).mockReturnValueOnce([]);

      await expect(ingest(input)).rejects.toThrow(
        expect.objectContaining({
          code: 'NO_CHUNKS',
        }),
      );
    });

    it('should throw on embedding failure', async () => {
      const input: IngestionInput = {
        type: 'text',
        content: 'This is test content with enough words to be valid for processing',
      };

      (ingestText as jest.Mock).mockReturnValueOnce({
        title: 'Test',
        content: 'This is test content with enough words to be valid for processing',
        type: 'TEXT',
      });

      (chunk as jest.Mock).mockReturnValueOnce([
        {
          content: 'Test content',
          chunkIndex: 0,
          tokenEstimate: 2,
        },
      ]);

      (embed as jest.Mock).mockRejectedValueOnce(new Error('Embedding service down'));

      await expect(ingest(input)).rejects.toThrow(
        expect.objectContaining({
          code: 'EMBEDDING_FAILED',
        }),
      );
    });

    it('should throw on storage failure', async () => {
      const input: IngestionInput = {
        type: 'text',
        content: 'This is test content with enough words to be valid for processing',
      };

      (ingestText as jest.Mock).mockReturnValueOnce({
        title: 'Test',
        content: 'This is test content with enough words to be valid for processing',
        type: 'TEXT',
      });

      (chunk as jest.Mock).mockReturnValueOnce([
        {
          content: 'Test content',
          chunkIndex: 0,
          tokenEstimate: 2,
        },
      ]);

      (embed as jest.Mock).mockResolvedValueOnce([[0.1, 0.2]]);

      (saveDocument as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(ingest(input)).rejects.toThrow(
        expect.objectContaining({
          code: 'STORAGE_FAILED',
        }),
      );
    });

    it('should handle multiple chunks', async () => {
      const input: IngestionInput = {
        type: 'text',
        content: 'This is test content '.repeat(50),
      };

      (ingestText as jest.Mock).mockReturnValueOnce({
        title: 'Long Document',
        content: 'This is test content '.repeat(50),
        type: 'TEXT',
      });

      const chunks = [
        { content: 'Chunk 1', chunkIndex: 0, tokenEstimate: 2 },
        { content: 'Chunk 2', chunkIndex: 1, tokenEstimate: 2 },
        { content: 'Chunk 3', chunkIndex: 2, tokenEstimate: 2 },
      ];
      (chunk as jest.Mock).mockReturnValueOnce(chunks);

      (embed as jest.Mock).mockResolvedValueOnce([[0.1], [0.2], [0.3]]);

      (saveDocument as jest.Mock).mockResolvedValueOnce('src-multi-123');

      const result = await ingest(input);

      expect(result.chunksCreated).toBe(3);
      expect(embed).toHaveBeenCalledWith(['Chunk 1', 'Chunk 2', 'Chunk 3']);
    });

    it('should measure processing time', async () => {
      const input: IngestionInput = {
        type: 'text',
        content: 'This is test content with enough words to be valid for processing',
      };

      (ingestText as jest.Mock).mockReturnValueOnce({
        title: 'Test',
        content: 'This is test content with enough words to be valid for processing',
        type: 'TEXT',
      });

      (chunk as jest.Mock).mockReturnValueOnce([
        { content: 'Test content', chunkIndex: 0, tokenEstimate: 2 },
      ]);

      (embed as jest.Mock).mockResolvedValueOnce([[0.1]]);

      (saveDocument as jest.Mock).mockResolvedValueOnce('src-123');

      const result = await ingest(input);

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.processingTimeMs).toBe('number');
    });
  });
});
