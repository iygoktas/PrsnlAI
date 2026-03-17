import { config } from '@/lib/config';
import { EmbeddingError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * Embeds an array of texts using Ollama's local embedding endpoint.
 * @param texts Array of text strings to embed
 * @returns Promise of 2D array of embeddings (each text -> embedding vector)
 */
export async function embedWithOllama(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  const ollamaUrl = config.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = config.OLLAMA_EMBEDDING_MODEL;

  if (!model) {
    throw new EmbeddingError('OLLAMA_EMBEDDING_MODEL is not set', 'MISSING_MODEL');
  }

  const embeddings: number[][] = [];

  try {
    for (const text of texts) {
      const response = await fetch(`${ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new EmbeddingError(
          `Ollama API error: ${response.status} ${response.statusText}`,
          'API_ERROR',
        );
      }

      const data = await response.json();

      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new EmbeddingError('Invalid Ollama response format', 'INVALID_RESPONSE');
      }

      embeddings.push(data.embedding);
      logger.debug(`Embedded text with Ollama`);
    }
  } catch (error) {
    if (error instanceof EmbeddingError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('ECONNREFUSED') || message.includes('Failed to fetch')) {
      throw new EmbeddingError(
        `Failed to connect to Ollama at ${ollamaUrl}. Make sure Ollama is running.`,
        'CONNECTION_ERROR',
      );
    }

    throw new EmbeddingError(`Failed to embed with Ollama: ${message}`, 'UNKNOWN_ERROR');
  }

  return embeddings;
}
