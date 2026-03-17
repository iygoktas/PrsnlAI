import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { SearchError } from '@/lib/errors';
import type { ScoredChunk } from '@/storage/vector';

/**
 * Generates an answer to a query using a local Ollama LLM, citing provided sources.
 * Falls back to local inference when the Anthropic API is unavailable.
 * @param query User's question
 * @param sources Array of scored chunks from semantic search
 * @returns LLM-generated answer with inline citations
 * @throws SearchError on API failure or configuration issues
 */
export async function generateAnswerLocal(query: string, sources: ScoredChunk[]): Promise<string> {
  if (!query || query.trim().length === 0) {
    throw new SearchError('Query cannot be empty', 'EMPTY_QUERY');
  }

  if (!config.OLLAMA_BASE_URL) {
    throw new SearchError('OLLAMA_BASE_URL not configured', 'MISSING_CONFIG');
  }

  if (!config.OLLAMA_LLM_MODEL) {
    throw new SearchError('OLLAMA_LLM_MODEL not configured', 'MISSING_CONFIG');
  }

  try {
    // Build source citations for the prompt
    const sourcesList = sources
      .map((source, index) => {
        const sourceTitle = source.id || 'Unknown source';
        return `[${index + 1}] ${sourceTitle}\n${source.content}`;
      })
      .join('\n\n');

    // Build the prompt using the same template as anthropic.ts
    const prompt = `You are a personal knowledge assistant. Answer the user's question using only
the provided source excerpts. Cite sources inline as [1], [2], etc.
If the answer is not in the sources, say so — do not make up information.

Sources:
${sourcesList}

Question: ${query}`;

    const ollamaUrl = new URL('/api/chat', config.OLLAMA_BASE_URL).toString();
    logger.debug(`Calling Ollama at ${ollamaUrl} with query: "${query}" and ${sources.length} sources`);

    const response = await fetch(ollamaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.OLLAMA_LLM_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new SearchError(
        `Ollama API returned ${response.status}: ${response.statusText}`,
        'HTTP_ERROR',
      );
    }

    const data = await response.json();

    if (!data.message || !data.message.content) {
      throw new SearchError('Invalid response from Ollama: missing message.content', 'INVALID_RESPONSE');
    }

    logger.info(`Generated answer using ${sources.length} sources via Ollama`);
    return data.message.content;
  } catch (error) {
    if (error instanceof SearchError) {
      throw error;
    }

    if (error instanceof TypeError) {
      // Network error
      logger.error(`Ollama connection failed: ${error.message}`);
      throw new SearchError(`Connection to Ollama failed: ${error.message}`, 'CONNECTION_ERROR');
    }

    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Ollama API call failed: ${message}`);
    throw new SearchError(`Failed to generate answer: ${message}`, 'API_ERROR');
  }
}
