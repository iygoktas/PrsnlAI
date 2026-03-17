/**
 * @jest-environment node
 */

import { POST } from '@/app/api/ingest/route';
import { IngestionError } from '@/lib/errors';
import { NextRequest } from 'next/server';

// Mock ingestion module
jest.mock('@/ingestion/index', () => ({
  ingest: jest.fn(),
}));

import { ingest } from '@/ingestion/index';

// Helper to create NextRequest
function createRequest(body: unknown) {
  return new NextRequest(new URL('http://localhost:3000/api/ingest'), {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/ingest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful ingestion', () => {
    it('should ingest plain text successfully', async () => {
      const mockResult = {
        sourceId: 'src-123',
        chunksCreated: 2,
        title: 'Test Document',
        processingTimeMs: 150,
      };

      (ingest as jest.Mock).mockResolvedValueOnce(mockResult);

      const request = createRequest({
        type: 'text',
        content: 'This is test content with enough words for ingestion',
        title: 'Test Document',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResult);
      expect(ingest).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text',
          content: 'This is test content with enough words for ingestion',
          title: 'Test Document',
        }),
      );
    });

    it('should ingest URL successfully', async () => {
      const mockResult = {
        sourceId: 'src-456',
        chunksCreated: 3,
        title: 'Example Article',
        processingTimeMs: 2500,
      };

      (ingest as jest.Mock).mockResolvedValueOnce(mockResult);

      const request = createRequest({
        type: 'url',
        content: 'https://example.com/article',
        title: 'Example Article',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResult);
    });

    it('should ingest text without title override', async () => {
      const mockResult = {
        sourceId: 'src-789',
        chunksCreated: 1,
        title: 'Untitled',
        processingTimeMs: 100,
      };

      (ingest as jest.Mock).mockResolvedValueOnce(mockResult);

      const request = createRequest({
        type: 'text',
        content: 'Some content here with enough words to process',
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(ingest).toHaveBeenCalledWith(
        expect.objectContaining({
          title: undefined,
        }),
      );
    });
  });

  describe('validation errors (400)', () => {
    it('should return 400 for invalid JSON', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/ingest'), {
        method: 'POST',
        body: '{invalid json}',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 400 for missing type field', async () => {
      const request = createRequest({
        content: 'Some content',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Validation failed');
    });

    it('should return 400 for missing content in text type', async () => {
      const request = createRequest({
        type: 'text',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid URL', async () => {
      const request = createRequest({
        type: 'url',
        content: 'not a valid url',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing file in PDF type', async () => {
      // For PDF, create a formData request without a file
      const request = new NextRequest(new URL('http://localhost:3000/api/ingest'), {
        method: 'POST',
        body: new FormData(),
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should include validation details in response', async () => {
      const request = createRequest({
        type: 'invalid_type',
        content: 'test',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.details).toBeDefined();
    });
  });

  describe('parsing/ingestion errors (422)', () => {
    it('should return 422 for PARSE_ERROR', async () => {
      (ingest as jest.Mock).mockRejectedValueOnce(
        new IngestionError('Content could not be parsed', 'PARSE_ERROR'),
      );

      const request = createRequest({
        type: 'text',
        content: 'Invalid content',
      });

      const response = await POST(request);

      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data.code).toBe('PARSE_ERROR');
    });

    it('should return 422 for NO_CHUNKS', async () => {
      (ingest as jest.Mock).mockRejectedValueOnce(
        new IngestionError('No chunks generated', 'NO_CHUNKS'),
      );

      const request = createRequest({
        type: 'text',
        content: 'x',
      });

      const response = await POST(request);

      expect(response.status).toBe(422);
    });

    it('should return 422 for TIMEOUT', async () => {
      (ingest as jest.Mock).mockRejectedValueOnce(
        new IngestionError('URL request timed out', 'TIMEOUT'),
      );

      const request = createRequest({
        type: 'url',
        content: 'https://example.com',
      });

      const response = await POST(request);

      expect(response.status).toBe(422);
    });

    it('should return 422 for INSUFFICIENT_CONTENT', async () => {
      (ingest as jest.Mock).mockRejectedValueOnce(
        new IngestionError('Content too short', 'INSUFFICIENT_CONTENT'),
      );

      const request = createRequest({
        type: 'url',
        content: 'https://example.com',
      });

      const response = await POST(request);

      expect(response.status).toBe(422);
    });
  });

  describe('internal errors (500)', () => {
    it('should return 500 for EMBEDDING_FAILED', async () => {
      (ingest as jest.Mock).mockRejectedValueOnce(
        new IngestionError('Embedding API down', 'EMBEDDING_FAILED'),
      );

      const request = createRequest({
        type: 'text',
        content: 'Some content here with enough words',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should return 500 for STORAGE_FAILED', async () => {
      (ingest as jest.Mock).mockRejectedValueOnce(
        new IngestionError('Database error', 'STORAGE_FAILED'),
      );

      const request = createRequest({
        type: 'text',
        content: 'Some content here with enough words',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should return 500 for unexpected errors', async () => {
      (ingest as jest.Mock).mockRejectedValueOnce(new Error('Unexpected error'));

      const request = createRequest({
        type: 'text',
        content: 'Some content here with enough words',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('response format', () => {
    it('should return correct response format', async () => {
      const mockResult = {
        sourceId: 'src-test',
        chunksCreated: 5,
        title: 'Test Title',
        processingTimeMs: 250,
      };

      (ingest as jest.Mock).mockResolvedValueOnce(mockResult);

      const request = createRequest({
        type: 'text',
        content: 'Test content with enough words for processing',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('sourceId');
      expect(data).toHaveProperty('chunksCreated');
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('processingTimeMs');
      expect(typeof data.sourceId).toBe('string');
      expect(typeof data.chunksCreated).toBe('number');
      expect(typeof data.title).toBe('string');
      expect(typeof data.processingTimeMs).toBe('number');
    });

    it('should return error code in error responses', async () => {
      (ingest as jest.Mock).mockRejectedValueOnce(
        new IngestionError('Test error', 'TEST_ERROR'),
      );

      const request = createRequest({
        type: 'text',
        content: 'Content',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('code');
      expect(data.code).toBe('TEST_ERROR');
    });
  });
});
