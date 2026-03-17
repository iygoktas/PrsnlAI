import { embed } from '@/embedding/index';

// Mock both providers
jest.mock('@/embedding/openai', () => ({
  embedWithOpenAI: jest.fn(),
}));

jest.mock('@/embedding/local', () => ({
  embedWithOllama: jest.fn(),
}));

import * as openaiModule from '@/embedding/openai';
import * as localModule from '@/embedding/local';

describe('embedding provider selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to OpenAI provider
    process.env.EMBEDDING_PROVIDER = 'openai';
  });

  describe('embed()', () => {
    it('should use OpenAI provider when EMBEDDING_PROVIDER=openai', async () => {
      const mockEmbeddings = [[0.1, 0.2], [0.3, 0.4]];
      (openaiModule.embedWithOpenAI as jest.Mock).mockResolvedValueOnce(
        mockEmbeddings,
      );

      const result = await embed(['text1', 'text2']);

      expect(result).toEqual(mockEmbeddings);
      expect(openaiModule.embedWithOpenAI).toHaveBeenCalledWith(['text1', 'text2']);
      expect(localModule.embedWithOllama).not.toHaveBeenCalled();
    });

    it('should use Ollama provider when EMBEDDING_PROVIDER=local', async () => {
      process.env.EMBEDDING_PROVIDER = 'local';
      jest.resetModules();
      const reloadedEmbed = (await import('@/embedding/index')).embed;
      const reloadedOpenAI = (await import('@/embedding/openai')).embedWithOpenAI;
      const reloadedLocal = (await import('@/embedding/local')).embedWithOllama;

      const mockEmbeddings = [[0.5, 0.6]];
      (reloadedLocal as jest.Mock).mockResolvedValueOnce(mockEmbeddings);

      const result = await reloadedEmbed(['test']);

      expect(result).toEqual(mockEmbeddings);
      expect(reloadedLocal).toHaveBeenCalledWith(['test']);
      expect(reloadedOpenAI).not.toHaveBeenCalled();
    });

    it('should pass through empty array', async () => {
      const mockEmbeddings: number[][] = [];
      (openaiModule.embedWithOpenAI as jest.Mock).mockResolvedValueOnce(
        mockEmbeddings,
      );

      const result = await embed([]);

      expect(result).toEqual([]);
      expect(openaiModule.embedWithOpenAI).toHaveBeenCalledWith([]);
    });

    it('should propagate provider-specific embeddings correctly', async () => {
      const texts = ['a', 'b', 'c', 'd'];
      const mockEmbeddings = [[0.1], [0.2], [0.3], [0.4]];
      (openaiModule.embedWithOpenAI as jest.Mock).mockResolvedValueOnce(
        mockEmbeddings,
      );

      const result = await embed(texts);

      expect(result).toEqual(mockEmbeddings);
      expect(result).toHaveLength(texts.length);
    });

    it('should pass errors from OpenAI provider', async () => {
      (openaiModule.embedWithOpenAI as jest.Mock).mockRejectedValueOnce(
        new Error('OpenAI error'),
      );

      await expect(embed(['test'])).rejects.toThrow('OpenAI error');
    });

    it('should pass errors from Ollama provider', async () => {
      process.env.EMBEDDING_PROVIDER = 'local';
      jest.resetModules();
      const reloadedEmbed = (await import('@/embedding/index')).embed;
      const reloadedLocal = (await import('@/embedding/local')).embedWithOllama;

      (reloadedLocal as jest.Mock).mockRejectedValueOnce(
        new Error('Ollama error'),
      );

      await expect(reloadedEmbed(['test'])).rejects.toThrow('Ollama error');
    });
  });
});
