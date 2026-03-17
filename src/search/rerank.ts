import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import type { SearchResult } from '@/search/semantic';

/**
 * Reranks search results by applying scoring threshold and deduplication.
 * Filters by similarity score threshold and keeps max 2 chunks per source.
 * @param results Array of search results from semantic search
 * @returns Filtered and deduplicated results, sorted by score descending
 */
export function rerank(results: SearchResult[]): SearchResult[] {
  const threshold = config.SIMILARITY_THRESHOLD;

  logger.debug(`Reranking ${results.length} results (threshold=${threshold})`);

  // Step 1: Filter by similarity threshold
  const filtered = results.filter((result) => result.score >= threshold);
  logger.debug(`After threshold filter: ${filtered.length} results`);

  // Step 2: Group by sourceId and keep max 2 chunks per source (highest scoring)
  const grouped = new Map<string, SearchResult[]>();
  for (const result of filtered) {
    if (!grouped.has(result.sourceId)) {
      grouped.set(result.sourceId, []);
    }
    grouped.get(result.sourceId)!.push(result);
  }

  // Flatten back to array, keeping only top 2 per source
  const deduplicated: SearchResult[] = [];
  for (const [, chunks] of grouped) {
    // Sort by score descending and take top 2
    const topChunks = chunks.sort((a, b) => b.score - a.score).slice(0, 2);
    deduplicated.push(...topChunks);
  }

  logger.debug(`After deduplication: ${deduplicated.length} results`);

  // Step 3: Sort by score descending
  const sorted = deduplicated.sort((a, b) => b.score - a.score);

  logger.info(`Reranking complete: ${sorted.length} final results`);
  return sorted;
}
