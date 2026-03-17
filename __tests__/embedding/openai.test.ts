import { embedWithOpenAI } from '@/embedding/openai';
import { EmbeddingError } from '@/lib/errors';

// Mock fetch and setTimeout globally
global.fetch = jest.fn();
jest.useFakeTimers();

describe('openai embedding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    process.env.OPENAI_API_KEY = 'test-key-123';
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('embedWithOpenAI()', () => {
    it('should return empty array for empty input', async () => {
      const result = await embedWithOpenAI([]);
      expect(result).toEqual([]);
    });

    it('should embed a single text', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ index: 0, embedding: mockEmbedding }],
        }),
      });

      const result = await embedWithOpenAI(['hello world']);

      expect(result).toEqual([mockEmbedding]);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe('https://api.openai.com/v1/embeddings');
      expect(callArgs[1].method).toBe('POST');
      expect(JSON.parse(callArgs[1].body)).toEqual({
        model: 'text-embedding-3-small',
        input: ['hello world'],
      });
    });

    it('should embed multiple texts in a single batch', async () => {
      const embeddings = [[0.1], [0.2], [0.3]];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: embeddings.map((emb, idx) => ({ index: idx, embedding: emb })),
        }),
      });

      const result = await embedWithOpenAI(['text1', 'text2', 'text3']);

      expect(result).toEqual(embeddings);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should batch large requests (100+ texts)', async () => {
      const texts = Array.from({ length: 250 }, (_, i) => `text ${i}`);
      const mockEmbedding = [0.5];

      // Mock 3 calls (100, 100, 50)
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: Array.from({ length: 100 }, (_, i) => ({
              index: i,
              embedding: mockEmbedding,
            })),
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: Array.from({ length: 100 }, (_, i) => ({
              index: i,
              embedding: mockEmbedding,
            })),
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: Array.from({ length: 50 }, (_, i) => ({
              index: i,
              embedding: mockEmbedding,
            })),
          }),
        });

      const result = await embedWithOpenAI(texts);

      expect(result).toHaveLength(250);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should retry on rate limit (429) errors', async () => {
      jest.useRealTimers(); // Use real timers for this test
      const mockEmbedding = [0.1];
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ index: 0, embedding: mockEmbedding }],
          }),
        });

      const result = await embedWithOpenAI(['test']);

      expect(result).toEqual([mockEmbedding]);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      jest.useFakeTimers(); // Re-enable fake timers
    }, 10000); // 10 second timeout for this test

    it('should fail after max retries on persistent 429 errors', async () => {
      jest.useRealTimers(); // Use real timers for this test
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      await expect(embedWithOpenAI(['test'])).rejects.toThrow(EmbeddingError);
      expect(global.fetch).toHaveBeenCalledTimes(5); // MAX_RETRIES
      jest.useFakeTimers(); // Re-enable fake timers
    }, 35000); // 35 second timeout (1s + 2s + 4s + 8s + 16s backoffs + padding)

    it('should throw on non-retryable API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid API key' }),
      });

      await expect(embedWithOpenAI(['test'])).rejects.toThrow(EmbeddingError);
    });

    it('should throw if OPENAI_API_KEY is not set', async () => {
      delete process.env.OPENAI_API_KEY;
      // Need to reload the module to pick up the missing env var
      jest.resetModules();
      const module = await import('@/embedding/openai');

      await expect(module.embedWithOpenAI(['test'])).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('OPENAI_API_KEY is not set'),
        }),
      );
    });

    it('should throw on invalid response format', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: null }),
      });

      await expect(embedWithOpenAI(['test'])).rejects.toThrow(EmbeddingError);
    });

    it('should throw if embedding count does not match input', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ index: 0, embedding: [0.1] }], // Only 1 embedding for 2 inputs
        }),
      });

      await expect(embedWithOpenAI(['text1', 'text2'])).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('count mismatch'),
        }),
      );
    });

    it('should sort embeddings by index from response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          // Return out of order to test sorting
          data: [
            { index: 2, embedding: [0.3] },
            { index: 0, embedding: [0.1] },
            { index: 1, embedding: [0.2] },
          ],
        }),
      });

      const result = await embedWithOpenAI(['text1', 'text2', 'text3']);

      expect(result).toEqual([[0.1], [0.2], [0.3]]);
    });
  });
});
