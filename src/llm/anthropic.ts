import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { SearchError } from '@/lib/errors';
import type { SearchResult } from '@/search/semantic';

/**
 * Initializes and returns an Anthropic API client.
 * Requires ANTHROPIC_API_KEY to be set in environment.
 */
function getAnthropicClient(): Anthropic {
  if (!config.ANTHROPIC_API_KEY) {
    throw new SearchError('ANTHROPIC_API_KEY not configured', 'MISSING_API_KEY');
  }
  return new Anthropic({
    apiKey: config.ANTHROPIC_API_KEY,
  });
}

/**
 * Formats a date to a readable string (e.g., "Mar 17, 2026").
 * @param date ISO 8601 date string or Date object
 * @returns Formatted date string
 */
function formatDate(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'Unknown date';
  }
}

/**
 * Generates an answer to a query using the Anthropic API, citing provided sources.
 * Uses the claude-haiku model for cost-effective RAG responses.
 * @param query User's question
 * @param sources Array of search results from semantic search
 * @returns LLM-generated answer with inline citations
 * @throws SearchError on API failure or configuration issues
 */
export async function generateAnswer(query: string, sources: SearchResult[]): Promise<string> {
  if (!query || query.trim().length === 0) {
    throw new SearchError('Query cannot be empty', 'EMPTY_QUERY');
  }

  try {
    const client = getAnthropicClient();

    // Build source citations for the prompt
    const sourcesList = sources
      .map((source, index) => {
        const sourceInfo = `${source.title}${source.url ? ` (${source.url})` : ''} - ${formatDate(source.createdAt)}`;
        return `[${index + 1}] ${sourceInfo}\n${source.excerpt}`;
      })
      .join('\n\n');

    // Build the prompt using the template from ARCHITECTURE.md
    const prompt = `You are a personal knowledge assistant. Answer the user's question using only
the provided source excerpts. Cite sources inline as [1], [2], etc.
If the answer is not in the sources, say so — do not make up information.

Sources:
${sourcesList}

Question: ${query}`;

    logger.debug(`Calling Anthropic API with query: "${query}" and ${sources.length} sources`);

    const message = await client.messages.create({
      model: config.ANTHROPIC_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text content from the response
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new SearchError('No text content in Anthropic response', 'INVALID_RESPONSE');
    }

    logger.info(`Generated answer using ${sources.length} sources`);
    return textContent.text;
  } catch (error) {
    if (error instanceof SearchError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Anthropic API call failed: ${message}`);
    throw new SearchError(`Failed to generate answer: ${message}`, 'API_ERROR');
  }
}
