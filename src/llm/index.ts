import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { SearchError } from '@/lib/errors';
import type { SearchResult } from '@/search/semantic';
import { generateAnswer as generateAnswerAnthropic } from '@/llm/anthropic';
import { generateAnswerLocal } from '@/llm/local';

/**
 * Generates an answer to a query using the configured LLM provider.
 * Routes to either Anthropic or Ollama based on LLM_PROVIDER config.
 * @param query User's question
 * @param sources Array of search results from semantic search
 * @returns LLM-generated answer with inline citations
 * @throws SearchError on provider error or invalid configuration
 */
export async function generateAnswer(query: string, sources: SearchResult[]): Promise<string> {
  const provider = config.LLM_PROVIDER;
  logger.debug(`Using LLM provider: ${provider}`);

  try {
    if (provider === 'anthropic') {
      return await generateAnswerAnthropic(query, sources);
    } else if (provider === 'local') {
      return await generateAnswerLocal(query, sources);
    } else {
      throw new SearchError(`Unknown LLM provider: ${provider}`, 'INVALID_PROVIDER');
    }
  } catch (error) {
    if (error instanceof SearchError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new SearchError(`LLM generation failed: ${message}`, 'UNKNOWN_ERROR');
  }
}
