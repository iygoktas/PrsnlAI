import { search } from '@/search/index';
import { SearchError } from '@/lib/errors';

// Mock sub-modules
jest.mock('@/search/semantic', () => ({
  semanticSearch: jest.fn(),
}));

jest.mock('@/search/rerank', () => ({
  rerank: jest.fn(),
}));

jest.mock('@/llm/index', () => ({
  generateAnswer: jest.fn(),
}));

import { semanticSearch } from '@/search/semantic';
import { rerank } from '@/search/rerank';
import { generateAnswer } from '@/llm/index';

describe('search/index (orchestrator)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('search()', () => {
    it('should perform complete search pipeline', async () => {
      const mockSemanticResults = [
        {
          sourceId: 'src-1',
          title: 'Source 1',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'Content 1',
          score: 0.95,
          chunkIndex: 0,
          pageNumber: null,
          createdAt: new Date(),
        },
        {
          sourceId: 'src-2',
          title: 'Source 2',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'Content 2',
          score: 0.85,
          chunkIndex: 0,
          pageNumber: null,
          createdAt: new Date(),
        },
      ];

      const mockRerankedResults = mockSemanticResults;

      (semanticSearch as jest.Mock).mockResolvedValueOnce(mockSemanticResults);
      (rerank as jest.Mock).mockReturnValueOnce(mockRerankedResults);
      (generateAnswer as jest.Mock).mockResolvedValueOnce('This is the answer.');

      const result = await search('test query');

      expect(result.answer).toBe('This is the answer.');
      expect(result.sources).toHaveLength(2);
      expect(semanticSearch).toHaveBeenCalledWith('test query', expect.any(Object));
      expect(rerank).toHaveBeenCalledWith(mockSemanticResults);
      expect(generateAnswer).toHaveBeenCalledWith('test query', mockRerankedResults);
    });

    it('should handle empty semantic search results', async () => {
      (semanticSearch as jest.Mock).mockResolvedValueOnce([]);
      (rerank as jest.Mock).mockReturnValueOnce([]);
      (generateAnswer as jest.Mock).mockResolvedValueOnce('No results found.');

      const result = await search('test query');

      expect(result.answer).toBe('No results found.');
      expect(result.sources).toEqual([]);
    });

    it('should throw on empty query', async () => {
      await expect(search('')).rejects.toThrow(
        expect.objectContaining({
          code: 'EMPTY_QUERY',
        }),
      );
    });

    it('should pass search options to semantic search', async () => {
      (semanticSearch as jest.Mock).mockResolvedValueOnce([]);
      (rerank as jest.Mock).mockReturnValueOnce([]);
      (generateAnswer as jest.Mock).mockResolvedValueOnce('Answer');

      const options = {
        sourceTypes: ['URL' as const],
        limit: 10,
      };

      await search('test', options);

      expect(semanticSearch).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          sourceTypes: ['URL'],
          topK: 10,
        }),
      );
    });

    it('should propagate semantic search errors', async () => {
      const error = new SearchError('Embedding failed', 'SEARCH_ERROR');
      (semanticSearch as jest.Mock).mockRejectedValueOnce(error);

      await expect(search('test')).rejects.toThrow(
        expect.objectContaining({
          code: 'SEARCH_ERROR',
        }),
      );
    });

    it('should propagate LLM generation errors', async () => {
      const mockResults = [
        {
          sourceId: 'src-1',
          title: 'Source 1',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'Content 1',
          score: 0.95,
          chunkIndex: 0,
          pageNumber: null,
          createdAt: new Date(),
        },
      ];

      const llmError = new SearchError('API Error', 'API_ERROR');

      (semanticSearch as jest.Mock).mockResolvedValueOnce(mockResults);
      (rerank as jest.Mock).mockReturnValueOnce(mockResults);
      (generateAnswer as jest.Mock).mockRejectedValueOnce(llmError);

      await expect(search('test')).rejects.toThrow(
        expect.objectContaining({
          code: 'API_ERROR',
        }),
      );
    });

    it('should handle non-SearchError exceptions gracefully', async () => {
      (semanticSearch as jest.Mock).mockRejectedValueOnce(new Error('Unexpected error'));

      await expect(search('test')).rejects.toThrow(
        expect.objectContaining({
          code: 'SEARCH_FAILED',
        }),
      );
    });

    it('should include all source metadata in response', async () => {
      const now = new Date();
      const mockResults = [
        {
          sourceId: 'src-1',
          title: 'Article Title',
          url: 'https://example.com/article',
          type: 'URL' as const,
          excerpt: 'Article excerpt here',
          score: 0.92,
          chunkIndex: 2,
          pageNumber: null,
          createdAt: now,
        },
      ];

      (semanticSearch as jest.Mock).mockResolvedValueOnce(mockResults);
      (rerank as jest.Mock).mockReturnValueOnce(mockResults);
      (generateAnswer as jest.Mock).mockResolvedValueOnce('Generated answer');

      const result = await search('test');

      expect(result.sources[0]).toEqual({
        sourceId: 'src-1',
        title: 'Article Title',
        url: 'https://example.com/article',
        type: 'URL',
        excerpt: 'Article excerpt here',
        score: 0.92,
        chunkIndex: 2,
        pageNumber: null,
        createdAt: now,
      });
    });

    it('should pass reranked results to generateAnswer', async () => {
      const mockSemanticResults = [
        {
          sourceId: 'src-1',
          title: 'Source 1',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'Content 1',
          score: 0.5,
          chunkIndex: 0,
          pageNumber: null,
          createdAt: new Date(),
        },
      ];

      const mockRerankedResults = []; // Filtered out by rerank

      (semanticSearch as jest.Mock).mockResolvedValueOnce(mockSemanticResults);
      (rerank as jest.Mock).mockReturnValueOnce(mockRerankedResults);
      (generateAnswer as jest.Mock).mockResolvedValueOnce('Answer');

      await search('test');

      expect(rerank).toHaveBeenCalledWith(mockSemanticResults);
      expect(generateAnswer).toHaveBeenCalledWith('test', mockRerankedResults);
    });

    it('should handle query with whitespace', async () => {
      await expect(search('   ')).rejects.toThrow(
        expect.objectContaining({
          code: 'EMPTY_QUERY',
        }),
      );
    });

    it('should use default options when not provided', async () => {
      (semanticSearch as jest.Mock).mockResolvedValueOnce([]);
      (rerank as jest.Mock).mockReturnValueOnce([]);
      (generateAnswer as jest.Mock).mockResolvedValueOnce('Answer');

      await search('test');

      expect(semanticSearch).toHaveBeenCalledWith('test', {
        sourceTypes: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        topK: undefined,
      });
    });

    it('should return SearchResponse with answer and sources', async () => {
      const mockResults = [
        {
          sourceId: 'src-1',
          title: 'Source',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'Content',
          score: 0.9,
          chunkIndex: 0,
          pageNumber: null,
          createdAt: new Date(),
        },
      ];

      (semanticSearch as jest.Mock).mockResolvedValueOnce(mockResults);
      (rerank as jest.Mock).mockReturnValueOnce(mockResults);
      (generateAnswer as jest.Mock).mockResolvedValueOnce('This is my answer.');

      const result = await search('test');

      expect(result).toHaveProperty('answer');
      expect(result).toHaveProperty('sources');
      expect(result.answer).toBe('This is my answer.');
      expect(result.sources).toEqual(mockResults);
    });
  });
});
