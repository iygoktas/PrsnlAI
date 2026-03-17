/**
 * @jest-environment node
 */

import { POST } from '@/app/api/search/route';
import { SearchError } from '@/lib/errors';
import { NextRequest } from 'next/server';

// Mock search module
jest.mock('@/search/index', () => ({
  search: jest.fn(),
}));

import { search } from '@/search/index';

// Helper to create NextRequest
function createRequest(body: unknown) {
  return new NextRequest(new URL('http://localhost:3000/api/search'), {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful search', () => {
    it('should perform search successfully', async () => {
      const mockResult = {
        answer: 'This is the generated answer based on the sources.',
        sources: [
          {
            sourceId: 'src-1',
            title: 'Source 1',
            url: 'https://example.com',
            type: 'URL' as const,
            excerpt: 'Relevant content from source',
            score: 0.95,
            chunkIndex: 0,
            pageNumber: null,
            createdAt: new Date(),
          },
        ],
      };

      (search as jest.Mock).mockResolvedValueOnce(mockResult);

      const request = createRequest({
        query: 'What is the answer?',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.answer).toBe(mockResult.answer);
      expect(data.sources).toHaveLength(1);
      expect(search).toHaveBeenCalledWith('What is the answer?', expect.any(Object));
    });

    it('should search with limit option', async () => {
      (search as jest.Mock).mockResolvedValueOnce({
        answer: 'Answer',
        sources: [],
      });

      const request = createRequest({
        query: 'test',
        limit: 10,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(search).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          limit: 10,
        }),
      );
    });

    it('should search with source type filter', async () => {
      (search as jest.Mock).mockResolvedValueOnce({
        answer: 'Answer',
        sources: [],
      });

      const request = createRequest({
        query: 'test',
        filter: {
          type: ['URL', 'PDF'],
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(search).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          sourceTypes: ['URL', 'PDF'],
        }),
      );
    });

    it('should search with date range filter', async () => {
      (search as jest.Mock).mockResolvedValueOnce({
        answer: 'Answer',
        sources: [],
      });

      const request = createRequest({
        query: 'test',
        filter: {
          dateFrom: '2024-01-01T00:00:00Z',
          dateTo: '2024-12-31T23:59:59Z',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const callArgs = (search as jest.Mock).mock.calls[0];
      expect(callArgs[1].dateFrom).toBeInstanceOf(Date);
      expect(callArgs[1].dateTo).toBeInstanceOf(Date);
    });

    it('should return empty sources if no results found', async () => {
      (search as jest.Mock).mockResolvedValueOnce({
        answer: 'I cannot find information about that topic.',
        sources: [],
      });

      const request = createRequest({
        query: 'obscure topic',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sources).toEqual([]);
    });
  });

  describe('validation errors (400)', () => {
    it('should return 400 for invalid JSON', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/search'), {
        method: 'POST',
        body: '{invalid json}',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing query', async () => {
      const request = createRequest({});

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Validation failed');
    });

    it('should return 400 for empty query', async () => {
      const request = createRequest({
        query: '',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid limit', async () => {
      const request = createRequest({
        query: 'test',
        limit: -5,
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid source type', async () => {
      const request = createRequest({
        query: 'test',
        filter: {
          type: ['INVALID_TYPE'],
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid date format', async () => {
      const request = createRequest({
        query: 'test',
        filter: {
          dateFrom: 'not-a-date',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should include validation details in response', async () => {
      const request = createRequest({
        limit: 'not-a-number',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.details).toBeDefined();
    });
  });

  describe('search errors (422)', () => {
    it('should return 422 for EMPTY_QUERY', async () => {
      (search as jest.Mock).mockRejectedValueOnce(
        new SearchError('Query cannot be empty', 'EMPTY_QUERY'),
      );

      const request = createRequest({
        query: 'test',
      });

      const response = await POST(request);

      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data.code).toBe('EMPTY_QUERY');
    });

    it('should return 422 for SEARCH_ERROR', async () => {
      (search as jest.Mock).mockRejectedValueOnce(
        new SearchError('Search pipeline failed', 'SEARCH_ERROR'),
      );

      const request = createRequest({
        query: 'test',
      });

      const response = await POST(request);

      expect(response.status).toBe(422);
    });

    it('should return 422 for CONNECTION_ERROR', async () => {
      (search as jest.Mock).mockRejectedValueOnce(
        new SearchError('Connection to Ollama failed', 'CONNECTION_ERROR'),
      );

      const request = createRequest({
        query: 'test',
      });

      const response = await POST(request);

      expect(response.status).toBe(422);
    });
  });

  describe('internal errors (500)', () => {
    it('should return 500 for API_ERROR', async () => {
      (search as jest.Mock).mockRejectedValueOnce(
        new SearchError('API Error', 'API_ERROR'),
      );

      const request = createRequest({
        query: 'test',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should return 500 for unexpected errors', async () => {
      (search as jest.Mock).mockRejectedValueOnce(new Error('Unexpected error'));

      const request = createRequest({
        query: 'test',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('response format', () => {
    it('should return correct response format', async () => {
      const now = new Date();
      const mockResult = {
        answer: 'Answer text here',
        sources: [
          {
            sourceId: 'src-1',
            title: 'Title',
            url: 'https://example.com',
            type: 'URL' as const,
            excerpt: 'Excerpt',
            score: 0.9,
            chunkIndex: 0,
            pageNumber: null,
            createdAt: now,
          },
        ],
      };

      (search as jest.Mock).mockResolvedValueOnce(mockResult);

      const request = createRequest({
        query: 'test',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('answer');
      expect(data).toHaveProperty('sources');
      expect(typeof data.answer).toBe('string');
      expect(Array.isArray(data.sources)).toBe(true);
    });

    it('should return source metadata in response', async () => {
      const mockResult = {
        answer: 'Answer',
        sources: [
          {
            sourceId: 'src-1',
            title: 'Document Title',
            url: 'https://example.com/doc',
            type: 'URL' as const,
            excerpt: 'This is the relevant excerpt.',
            score: 0.92,
            chunkIndex: 2,
            pageNumber: 5,
            createdAt: new Date('2024-01-15'),
          },
        ],
      };

      (search as jest.Mock).mockResolvedValueOnce(mockResult);

      const request = createRequest({
        query: 'test',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.sources[0]).toEqual({
        sourceId: 'src-1',
        title: 'Document Title',
        url: 'https://example.com/doc',
        type: 'URL',
        excerpt: 'This is the relevant excerpt.',
        score: 0.92,
        chunkIndex: 2,
        pageNumber: 5,
        createdAt: '2024-01-15T00:00:00.000Z',
      });
    });

    it('should return error code in error responses', async () => {
      (search as jest.Mock).mockRejectedValueOnce(
        new SearchError('Test error', 'TEST_CODE'),
      );

      const request = createRequest({
        query: 'test',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('code');
      expect(data.code).toBe('TEST_CODE');
    });
  });

  describe('filter combinations', () => {
    it('should handle all filter options together', async () => {
      (search as jest.Mock).mockResolvedValueOnce({
        answer: 'Answer',
        sources: [],
      });

      const request = createRequest({
        query: 'test',
        limit: 5,
        filter: {
          type: ['URL', 'TEXT'],
          dateFrom: '2024-01-01T00:00:00Z',
          dateTo: '2024-12-31T23:59:59Z',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const callArgs = (search as jest.Mock).mock.calls[0];
      expect(callArgs[1]).toEqual({
        sourceTypes: ['URL', 'TEXT'],
        dateFrom: expect.any(Date),
        dateTo: expect.any(Date),
        limit: 5,
      });
    });

    it('should handle partial filter options', async () => {
      (search as jest.Mock).mockResolvedValueOnce({
        answer: 'Answer',
        sources: [],
      });

      const request = createRequest({
        query: 'test',
        filter: {
          dateFrom: '2024-06-01T00:00:00Z',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const callArgs = (search as jest.Mock).mock.calls[0];
      expect(callArgs[1].dateFrom).toBeInstanceOf(Date);
      expect(callArgs[1].dateTo).toBeUndefined();
    });
  });
});
