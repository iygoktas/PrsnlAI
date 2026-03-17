import { embed } from '@/embedding/index';
import { similaritySearch, type ScoredChunk, type VectorFilter } from '@/storage/vector';
import { getSource } from '@/storage/metadata';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { SearchError } from '@/lib/errors';
import type { Prisma } from '@prisma/client';

/**
 * A search result containing a chunk and its source metadata.
 */
export interface SearchResult {
  sourceId: string;
  title: string;
  url?: string;
  type: Prisma.SourceType;
  excerpt: string;
  score: number;
  chunkIndex: number;
  pageNumber: number | null;
  createdAt: Date;
}

/**
 * Options for semantic search.
 */
export interface SemanticSearchOptions {
  sourceTypes?: Prisma.SourceType[];
  dateFrom?: Date;
  dateTo?: Date;
  topK?: number;
}

/**
 * Performs semantic search on the knowledge base.
 * Embeds the query and finds similar chunks via vector search.
 * @param query Search query string
 * @param options Optional filters and result limit
 * @returns Array of search results with scores and source metadata
 * @throws SearchError on embedding or database errors
 */
export async function semanticSearch(
  query: string,
  options?: SemanticSearchOptions,
): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) {
    throw new SearchError('Query cannot be empty', 'EMPTY_QUERY');
  }

  const topK = options?.topK || config.SEARCH_TOP_K;

  try {
    logger.debug(`Semantic search for: "${query}" (topK=${topK})`);

    // Embed the query
    const embeddings = await embed([query]);
    const queryEmbedding = embeddings[0];

    // Build vector filter
    const vectorFilter: VectorFilter = {};
    if (options?.sourceTypes && options.sourceTypes.length > 0) {
      // Note: VectorFilter doesn't directly support source type filtering
      // This would require joining with Source table in vector.ts
      // For now, we'll filter after retrieval
    }

    // Perform similarity search
    const scoredChunks = await similaritySearch(queryEmbedding, topK, vectorFilter);

    // Enrich chunks with source metadata
    const results: SearchResult[] = [];
    for (const chunk of scoredChunks) {
      try {
        const source = await getSource(chunk.sourceId);
        if (!source) {
          logger.warn(`Source ${chunk.sourceId} not found for chunk ${chunk.id}`);
          continue;
        }

        // Filter by source type if specified
        if (options?.sourceTypes && !options.sourceTypes.includes(source.type)) {
          continue;
        }

        // Filter by date range if specified
        if (options?.dateFrom && source.createdAt < options.dateFrom) {
          continue;
        }
        if (options?.dateTo && source.createdAt > options.dateTo) {
          continue;
        }

        results.push({
          sourceId: chunk.sourceId,
          title: source.title,
          url: source.url || undefined,
          type: source.type,
          excerpt: chunk.content,
          score: chunk.score,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
          createdAt: source.createdAt,
        });
      } catch (error) {
        logger.error(`Failed to fetch source ${chunk.sourceId}: ${error}`);
        // Continue with other chunks
        continue;
      }
    }

    logger.info(`Semantic search found ${results.length} results`);
    return results;
  } catch (error) {
    if (error instanceof SearchError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Semantic search failed: ${message}`);
    throw new SearchError(`Semantic search failed: ${message}`, 'SEARCH_ERROR');
  }
}
