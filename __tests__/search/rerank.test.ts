import { rerank } from '@/search/rerank';

// Mock config module
jest.mock('@/lib/config', () => ({
  config: {
    SIMILARITY_THRESHOLD: 0.7,
  },
}));

describe('search/rerank', () => {
  describe('rerank()', () => {
    it('should filter results below similarity threshold', () => {
      const results = [
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
          score: 0.65, // Below threshold (0.7)
          chunkIndex: 0,
          pageNumber: null,
          createdAt: new Date(),
        },
        {
          sourceId: 'src-3',
          title: 'Source 3',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'Content 3',
          score: 0.8,
          chunkIndex: 0,
          pageNumber: null,
          createdAt: new Date(),
        },
      ];

      const reranked = rerank(results);

      expect(reranked).toHaveLength(2);
      expect(reranked.every((r) => r.score >= 0.7)).toBe(true);
    });

    it('should keep max 2 chunks per source', () => {
      const results = [
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
          sourceId: 'src-1',
          title: 'Source 1',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'Content 2',
          score: 0.92,
          chunkIndex: 1,
          pageNumber: null,
          createdAt: new Date(),
        },
        {
          sourceId: 'src-1',
          title: 'Source 1',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'Content 3',
          score: 0.88,
          chunkIndex: 2,
          pageNumber: null,
          createdAt: new Date(),
        },
      ];

      const reranked = rerank(results);

      expect(reranked).toHaveLength(2);
      expect(reranked.every((r) => r.sourceId === 'src-1')).toBe(true);
      expect(reranked[0].score).toBe(0.95);
      expect(reranked[1].score).toBe(0.92);
    });

    it('should sort by score descending', () => {
      const results = [
        {
          sourceId: 'src-1',
          title: 'Source 1',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'Content 1',
          score: 0.75,
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
          score: 0.95,
          chunkIndex: 0,
          pageNumber: null,
          createdAt: new Date(),
        },
        {
          sourceId: 'src-3',
          title: 'Source 3',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'Content 3',
          score: 0.85,
          chunkIndex: 0,
          pageNumber: null,
          createdAt: new Date(),
        },
      ];

      const reranked = rerank(results);

      expect(reranked[0].score).toBe(0.95);
      expect(reranked[1].score).toBe(0.85);
      expect(reranked[2].score).toBe(0.75);
    });

    it('should handle empty results', () => {
      const reranked = rerank([]);

      expect(reranked).toEqual([]);
    });

    it('should handle all results below threshold', () => {
      const results = [
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
        {
          sourceId: 'src-2',
          title: 'Source 2',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'Content 2',
          score: 0.6,
          chunkIndex: 0,
          pageNumber: null,
          createdAt: new Date(),
        },
      ];

      const reranked = rerank(results);

      expect(reranked).toEqual([]);
    });

    it('should deduplicate with threshold and sorting together', () => {
      const results = [
        {
          sourceId: 'src-1',
          title: 'Source 1',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'Content 1a',
          score: 0.95,
          chunkIndex: 0,
          pageNumber: null,
          createdAt: new Date(),
        },
        {
          sourceId: 'src-1',
          title: 'Source 1',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'Content 1b',
          score: 0.88,
          chunkIndex: 1,
          pageNumber: null,
          createdAt: new Date(),
        },
        {
          sourceId: 'src-2',
          title: 'Source 2',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'Content 2a',
          score: 0.92,
          chunkIndex: 0,
          pageNumber: null,
          createdAt: new Date(),
        },
        {
          sourceId: 'src-2',
          title: 'Source 2',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'Content 2b',
          score: 0.75,
          chunkIndex: 1,
          pageNumber: null,
          createdAt: new Date(),
        },
      ];

      const reranked = rerank(results);

      expect(reranked).toHaveLength(4); // 2 from each source
      expect(reranked[0].score).toBe(0.95); // src-1 chunk 0
      expect(reranked[1].score).toBe(0.92); // src-2 chunk 0
      expect(reranked[2].score).toBe(0.88); // src-1 chunk 1
      expect(reranked[3].score).toBe(0.75); // src-2 chunk 1
    });

    it('should handle results with null URLs', () => {
      const results = [
        {
          sourceId: 'src-1',
          title: 'Source 1',
          type: 'PDF' as const,
          excerpt: 'Content 1',
          score: 0.95,
          chunkIndex: 0,
          pageNumber: 1,
          createdAt: new Date(),
        },
      ];

      const reranked = rerank(results);

      expect(reranked).toHaveLength(1);
      expect(reranked[0].url).toBeUndefined();
    });

    it('should handle mixed source types', () => {
      const results = [
        {
          sourceId: 'src-1',
          title: 'URL Source',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'Content 1',
          score: 0.9,
          chunkIndex: 0,
          pageNumber: null,
          createdAt: new Date(),
        },
        {
          sourceId: 'src-2',
          title: 'PDF Source',
          type: 'PDF' as const,
          excerpt: 'Content 2',
          score: 0.85,
          chunkIndex: 0,
          pageNumber: 3,
          createdAt: new Date(),
        },
        {
          sourceId: 'src-3',
          title: 'Text Source',
          type: 'TEXT' as const,
          excerpt: 'Content 3',
          score: 0.8,
          chunkIndex: 0,
          pageNumber: null,
          createdAt: new Date(),
        },
      ];

      const reranked = rerank(results);

      expect(reranked).toHaveLength(3);
      expect(reranked[0].type).toBe('URL');
      expect(reranked[1].type).toBe('PDF');
      expect(reranked[2].type).toBe('TEXT');
    });

    it('should preserve chunk metadata during reranking', () => {
      const createdDate = new Date('2024-01-15');
      const results = [
        {
          sourceId: 'src-1',
          title: 'Source 1',
          url: 'https://example.com/article',
          type: 'URL' as const,
          excerpt: 'Some important content here',
          score: 0.92,
          chunkIndex: 2,
          pageNumber: 5,
          createdAt: createdDate,
        },
      ];

      const reranked = rerank(results);

      expect(reranked[0]).toEqual({
        sourceId: 'src-1',
        title: 'Source 1',
        url: 'https://example.com/article',
        type: 'URL',
        excerpt: 'Some important content here',
        score: 0.92,
        chunkIndex: 2,
        pageNumber: 5,
        createdAt: createdDate,
      });
    });

    it('should select highest scoring chunks when deduplicating', () => {
      const results = [
        {
          sourceId: 'src-1',
          title: 'Source 1',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'Low score chunk',
          score: 0.72,
          chunkIndex: 0,
          pageNumber: null,
          createdAt: new Date(),
        },
        {
          sourceId: 'src-1',
          title: 'Source 1',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'High score chunk',
          score: 0.95,
          chunkIndex: 1,
          pageNumber: null,
          createdAt: new Date(),
        },
        {
          sourceId: 'src-1',
          title: 'Source 1',
          url: 'https://example.com',
          type: 'URL' as const,
          excerpt: 'Medium score chunk',
          score: 0.85,
          chunkIndex: 2,
          pageNumber: null,
          createdAt: new Date(),
        },
      ];

      const reranked = rerank(results);

      expect(reranked).toHaveLength(2);
      expect(reranked[0].score).toBe(0.95);
      expect(reranked[1].score).toBe(0.85);
    });
  });
});
