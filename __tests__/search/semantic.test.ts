import { semanticSearch } from '@/search/semantic';
import { SearchError } from '@/lib/errors';

// Mock embedding module
jest.mock('@/embedding/index', () => ({
  embed: jest.fn(),
}));

// Mock storage modules
jest.mock('@/storage/vector', () => ({
  similaritySearch: jest.fn(),
}));

jest.mock('@/storage/metadata', () => ({
  getSource: jest.fn(),
}));

import { embed } from '@/embedding/index';
import { similaritySearch } from '@/storage/vector';
import { getSource } from '@/storage/metadata';

describe('search/semantic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('semanticSearch()', () => {
    it('should perform semantic search and return results with source metadata', async () => {
      const mockEmbedding = [[0.1, 0.2, 0.3]];
      const mockScoredChunks = [
        {
          id: 'chunk-1',
          sourceId: 'src-1',
          content: 'Information about RAG',
          chunkIndex: 0,
          pageNumber: null,
          score: 0.95,
          createdAt: new Date('2024-01-15'),
        },
      ];

      const mockSource = {
        id: 'src-1',
        type: 'URL' as const,
        title: 'RAG Introduction',
        url: 'https://example.com/rag',
        filePath: null,
        content: 'Full content',
        createdAt: new Date('2024-01-15'),
        chunks: [],
      };

      (embed as jest.Mock).mockResolvedValueOnce(mockEmbedding);
      (similaritySearch as jest.Mock).mockResolvedValueOnce(mockScoredChunks);
      (getSource as jest.Mock).mockResolvedValueOnce(mockSource);

      const results = await semanticSearch('What is RAG?');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        sourceId: 'src-1',
        title: 'RAG Introduction',
        url: 'https://example.com/rag',
        type: 'URL',
        excerpt: 'Information about RAG',
        score: 0.95,
        chunkIndex: 0,
        pageNumber: null,
        createdAt: new Date('2024-01-15'),
      });

      expect(embed).toHaveBeenCalledWith(['What is RAG?']);
      expect(similaritySearch).toHaveBeenCalledWith(mockEmbedding[0], expect.any(Number), expect.any(Object));
    });

    it('should use topK from options', async () => {
      (embed as jest.Mock).mockResolvedValueOnce([[0.1, 0.2, 0.3]]);
      (similaritySearch as jest.Mock).mockResolvedValueOnce([]);

      await semanticSearch('test', { topK: 10 });

      const callArgs = (similaritySearch as jest.Mock).mock.calls[0];
      expect(callArgs[1]).toBe(10);
    });

    it('should use default topK from config', async () => {
      (embed as jest.Mock).mockResolvedValueOnce([[0.1, 0.2, 0.3]]);
      (similaritySearch as jest.Mock).mockResolvedValueOnce([]);

      await semanticSearch('test');

      const callArgs = (similaritySearch as jest.Mock).mock.calls[0];
      expect(typeof callArgs[1]).toBe('number');
      expect(callArgs[1]).toBeGreaterThan(0);
    });

    it('should filter results by source type', async () => {
      const mockEmbedding = [[0.1, 0.2, 0.3]];
      const mockScoredChunks = [
        {
          id: 'chunk-1',
          sourceId: 'src-1',
          content: 'Content 1',
          chunkIndex: 0,
          pageNumber: null,
          score: 0.95,
          createdAt: new Date(),
        },
        {
          id: 'chunk-2',
          sourceId: 'src-2',
          content: 'Content 2',
          chunkIndex: 0,
          pageNumber: null,
          score: 0.85,
          createdAt: new Date(),
        },
      ];

      const urlSource = {
        id: 'src-1',
        type: 'URL' as const,
        title: 'URL Source',
        url: 'https://example.com',
        filePath: null,
        content: 'Content',
        createdAt: new Date(),
        chunks: [],
      };

      const pdfSource = {
        id: 'src-2',
        type: 'PDF' as const,
        title: 'PDF Source',
        url: null,
        filePath: '/path/to/file.pdf',
        content: 'Content',
        createdAt: new Date(),
        chunks: [],
      };

      (embed as jest.Mock).mockResolvedValueOnce(mockEmbedding);
      (similaritySearch as jest.Mock).mockResolvedValueOnce(mockScoredChunks);
      (getSource as jest.Mock)
        .mockResolvedValueOnce(urlSource)
        .mockResolvedValueOnce(pdfSource);

      const results = await semanticSearch('test', { sourceTypes: ['URL'] });

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('URL');
    });

    it('should filter results by date range', async () => {
      const mockEmbedding = [[0.1, 0.2, 0.3]];
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const mockScoredChunks = [
        {
          id: 'chunk-1',
          sourceId: 'src-1',
          content: 'Old content',
          chunkIndex: 0,
          pageNumber: null,
          score: 0.95,
          createdAt: now,
        },
      ];

      const source = {
        id: 'src-1',
        type: 'TEXT' as const,
        title: 'Source',
        url: null,
        filePath: null,
        content: 'Content',
        createdAt: yesterday,
        chunks: [],
      };

      (embed as jest.Mock).mockResolvedValueOnce(mockEmbedding);
      (similaritySearch as jest.Mock).mockResolvedValueOnce(mockScoredChunks);
      (getSource as jest.Mock).mockResolvedValueOnce(source);

      const results = await semanticSearch('test', { dateFrom: yesterday, dateTo: tomorrow });

      expect(results).toHaveLength(1);
    });

    it('should throw on empty query', async () => {
      await expect(semanticSearch('')).rejects.toThrow(
        expect.objectContaining({
          code: 'EMPTY_QUERY',
        }),
      );
    });

    it('should return empty results if no chunks found', async () => {
      (embed as jest.Mock).mockResolvedValueOnce([[0.1, 0.2, 0.3]]);
      (similaritySearch as jest.Mock).mockResolvedValueOnce([]);

      const results = await semanticSearch('test');

      expect(results).toEqual([]);
    });

    it('should skip chunks with missing source', async () => {
      const mockEmbedding = [[0.1, 0.2, 0.3]];
      const mockScoredChunks = [
        {
          id: 'chunk-1',
          sourceId: 'src-missing',
          content: 'Content',
          chunkIndex: 0,
          pageNumber: null,
          score: 0.95,
          createdAt: new Date(),
        },
      ];

      (embed as jest.Mock).mockResolvedValueOnce(mockEmbedding);
      (similaritySearch as jest.Mock).mockResolvedValueOnce(mockScoredChunks);
      (getSource as jest.Mock).mockResolvedValueOnce(null);

      const results = await semanticSearch('test');

      expect(results).toEqual([]);
    });

    it('should handle errors from embed gracefully', async () => {
      (embed as jest.Mock).mockRejectedValueOnce(new Error('Embedding failed'));

      await expect(semanticSearch('test')).rejects.toThrow(
        expect.objectContaining({
          code: 'SEARCH_ERROR',
        }),
      );
    });

    it('should handle errors from similaritySearch gracefully', async () => {
      (embed as jest.Mock).mockResolvedValueOnce([[0.1, 0.2, 0.3]]);
      (similaritySearch as jest.Mock).mockRejectedValueOnce(new Error('Vector search failed'));

      await expect(semanticSearch('test')).rejects.toThrow(
        expect.objectContaining({
          code: 'SEARCH_ERROR',
        }),
      );
    });

    it('should handle multiple results with different source types', async () => {
      const mockEmbedding = [[0.1, 0.2, 0.3]];
      const mockScoredChunks = [
        {
          id: 'chunk-1',
          sourceId: 'src-1',
          content: 'URL content',
          chunkIndex: 0,
          pageNumber: null,
          score: 0.95,
          createdAt: new Date(),
        },
        {
          id: 'chunk-2',
          sourceId: 'src-2',
          content: 'PDF content',
          chunkIndex: 0,
          pageNumber: 2,
          score: 0.85,
          createdAt: new Date(),
        },
      ];

      const urlSource = {
        id: 'src-1',
        type: 'URL' as const,
        title: 'URL Title',
        url: 'https://example.com',
        filePath: null,
        content: 'Content',
        createdAt: new Date(),
        chunks: [],
      };

      const pdfSource = {
        id: 'src-2',
        type: 'PDF' as const,
        title: 'PDF Title',
        url: null,
        filePath: '/path/to/file.pdf',
        content: 'Content',
        createdAt: new Date(),
        chunks: [],
      };

      (embed as jest.Mock).mockResolvedValueOnce(mockEmbedding);
      (similaritySearch as jest.Mock).mockResolvedValueOnce(mockScoredChunks);
      (getSource as jest.Mock)
        .mockResolvedValueOnce(urlSource)
        .mockResolvedValueOnce(pdfSource);

      const results = await semanticSearch('test');

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('URL');
      expect(results[1].type).toBe('PDF');
      expect(results[1].pageNumber).toBe(2);
    });

    it('should handle source without URL gracefully', async () => {
      const mockEmbedding = [[0.1, 0.2, 0.3]];
      const mockScoredChunks = [
        {
          id: 'chunk-1',
          sourceId: 'src-1',
          content: 'Content',
          chunkIndex: 0,
          pageNumber: null,
          score: 0.95,
          createdAt: new Date(),
        },
      ];

      const source = {
        id: 'src-1',
        type: 'TEXT' as const,
        title: 'Text Source',
        url: null,
        filePath: null,
        content: 'Content',
        createdAt: new Date(),
        chunks: [],
      };

      (embed as jest.Mock).mockResolvedValueOnce(mockEmbedding);
      (similaritySearch as jest.Mock).mockResolvedValueOnce(mockScoredChunks);
      (getSource as jest.Mock).mockResolvedValueOnce(source);

      const results = await semanticSearch('test');

      expect(results).toHaveLength(1);
      expect(results[0].url).toBeUndefined();
    });
  });
});
