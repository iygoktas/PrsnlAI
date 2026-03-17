import { embedWithOllama } from '@/embedding/local';
import { EmbeddingError } from '@/lib/errors';

global.fetch = jest.fn();

describe('local (Ollama) embedding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
    process.env.OLLAMA_EMBEDDING_MODEL = 'nomic-embed-text';
  });

  describe('embedWithOllama()', () => {
    it('should return empty array for empty input', async () => {
      const result = await embedWithOllama([]);
      expect(result).toEqual([]);
    });

    it('should embed a single text', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          embedding: mockEmbedding,
        }),
      });

      const result = await embedWithOllama(['hello world']);

      expect(result).toEqual([mockEmbedding]);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe('http://localhost:11434/api/embeddings');
      expect(callArgs[1].method).toBe('POST');
      expect(JSON.parse(callArgs[1].body)).toEqual({
        model: 'nomic-embed-text',
        prompt: 'hello world',
      });
    });

    it('should embed multiple texts sequentially', async () => {
      const embeddings = [[0.1], [0.2], [0.3]];
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: embeddings[0] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: embeddings[1] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: embeddings[2] }),
        });

      const result = await embedWithOllama(['text1', 'text2', 'text3']);

      expect(result).toEqual(embeddings);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw if OLLAMA_EMBEDDING_MODEL is not set', async () => {
      delete process.env.OLLAMA_EMBEDDING_MODEL;
      jest.resetModules();
      const module = await import('@/embedding/local');

      await expect(module.embedWithOllama(['test'])).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('OLLAMA_EMBEDDING_MODEL is not set'),
        }),
      );
    });

    it('should throw on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(embedWithOllama(['test'])).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Ollama API error'),
        }),
      );
    });

    it('should throw on invalid response format', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: null }),
      });

      await expect(embedWithOllama(['test'])).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Invalid Ollama response format'),
        }),
      );
    });

    it('should throw CONNECTION_ERROR when Ollama is not running', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new TypeError('Failed to fetch'),
      );

      await expect(embedWithOllama(['test'])).rejects.toThrow(
        expect.objectContaining({
          code: 'CONNECTION_ERROR',
          message: expect.stringContaining('Failed to connect to Ollama'),
        }),
      );
    });

    it('should use custom OLLAMA_BASE_URL if provided', async () => {
      process.env.OLLAMA_BASE_URL = 'http://custom-ollama:11434';
      jest.resetModules();
      const module = await import('@/embedding/local');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: [0.1] }),
      });

      await module.embedWithOllama(['test']);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('custom-ollama');
    });

    it('should handle missing response.embedding field', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [0.1] }), // wrong field name
      });

      await expect(embedWithOllama(['test'])).rejects.toThrow(EmbeddingError);
    });
  });
});
