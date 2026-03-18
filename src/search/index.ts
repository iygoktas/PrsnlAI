import { semanticSearch, type SemanticSearchOptions, type SearchResult } from '@/search/semantic';
import { rerank } from '@/search/rerank';
import { generateAnswer } from '@/llm/index';
import { logger } from '@/lib/logger';
import { SearchError } from '@/lib/errors';
import type { Prisma } from '@prisma/client';

/**
 * Options for the search operation.
 */
export interface SearchOptions {
  sourceTypes?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

/**
 * Response from the search operation.
 */
export interface SearchResponse {
  answer: string;
  sources: SearchResult[];
}

/**
 * Performs a complete search operation: semantic search → rerank → LLM answer generation.
 * @param query Search query string
 * @param options Optional filters and limits
 * @returns Answer with supporting sources
 * @throws SearchError on any step failure
 */
export async function search(query: string, options?: SearchOptions): Promise<SearchResponse> {
  if (!query || query.trim().length === 0) {
    throw new SearchError('Query cannot be empty', 'EMPTY_QUERY');
  }

  try {
    logger.debug(`Starting search for: "${query}"`);

    // Step 1: Semantic search
    const semanticOptions: SemanticSearchOptions = {
      sourceTypes: options?.sourceTypes,
      dateFrom: options?.dateFrom,
      dateTo: options?.dateTo,
      topK: options?.limit,
    };

    const semanticResults = await semanticSearch(query, semanticOptions);
    logger.debug(`Semantic search returned ${semanticResults.length} results`);

    // Step 2: Rerank
    const rerankedResults = rerank(semanticResults);
    logger.debug(`After reranking: ${rerankedResults.length} results`);

    // Step 3: Generate answer
    if (rerankedResults.length === 0) {
      return {
        answer: "I couldn't find any relevant information in your knowledge base to answer that question.",
        sources: [],
      };
    }
    const answer = await generateAnswer(query, rerankedResults);
    logger.info(`Search complete: generated answer with ${rerankedResults.length} sources`);

    return {
      answer,
      sources: rerankedResults,
    };
  } catch (error) {
    if (error instanceof SearchError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Search failed: ${message}`);
    throw new SearchError(`Search failed: ${message}`, 'SEARCH_FAILED');
  }
}
