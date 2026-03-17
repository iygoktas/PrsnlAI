import { config } from '@/lib/config';
import { embedWithOpenAI } from '@/embedding/openai';
import { embedWithOllama } from '@/embedding/local';

/**
 * Embeds texts using the configured embedding provider (OpenAI or Ollama).
 * @param texts Array of text strings to embed
 * @returns Promise of 2D array of embeddings
 */
export async function embed(texts: string[]): Promise<number[][]> {
  if (config.EMBEDDING_PROVIDER === 'openai') {
    return embedWithOpenAI(texts);
  } else if (config.EMBEDDING_PROVIDER === 'local') {
    return embedWithOllama(texts);
  } else {
    throw new Error(`Unknown embedding provider: ${config.EMBEDDING_PROVIDER}`);
  }
}
