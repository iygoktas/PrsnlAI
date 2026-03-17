import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface ChunkWithEmbedding {
  id: string;
  sourceId: string;
  content: string;
  chunkIndex: number;
  pageNumber?: number;
  embedding: number[];
}

export interface ScoredChunk {
  id: string;
  sourceId: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  score: number;
  createdAt: Date;
}

export interface VectorFilter {
  sourceIds?: string[];
  minScore?: number;
}

/**
 * Formats an embedding array as a pgvector literal for SQL.
 * @param embedding Array of numbers
 * @returns String representation for pgvector, e.g., "[0.1,0.2,0.3]"
 */
function formatEmbedding(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

/**
 * Inserts chunks with embeddings into the database.
 * Uses raw SQL because Prisma doesn't support vector inserts directly.
 * @param chunks Array of chunks with embeddings
 */
export async function insertChunks(chunks: ChunkWithEmbedding[]): Promise<void> {
  if (!chunks || chunks.length === 0) {
    return;
  }

  try {
    // Build a VALUES clause for bulk insert
    const values = chunks
      .map(
        (chunk) =>
          `('${chunk.id}', '${chunk.sourceId}', '${chunk.content.replace(/'/g, "''")}', ${chunk.chunkIndex}, ${chunk.pageNumber ?? 'NULL'}, '${formatEmbedding(chunk.embedding)}'::vector)`,
      )
      .join(',');

    // Use template tag for $executeRaw (required by Prisma)
    // Note: values are already properly escaped in the values array
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Chunk" (id, "sourceId", content, "chunkIndex", "pageNumber", embedding)
      VALUES ${values}
      ON CONFLICT (id) DO NOTHING
    `);
    logger.info(`Inserted ${chunks.length} chunks with embeddings`);
  } catch (error) {
    logger.error(`Failed to insert chunks: ${error}`);
    throw error;
  }
}

/**
 * Performs semantic similarity search using pgvector.
 * Finds chunks most similar to the provided embedding.
 * @param embedding Query embedding vector
 * @param topK Number of results to return
 * @param filter Optional filters (source IDs, minimum score)
 * @returns Array of scored chunks sorted by similarity (highest first)
 */
export async function similaritySearch(
  embedding: number[],
  topK: number,
  filter?: VectorFilter,
): Promise<ScoredChunk[]> {
  try {
    const embeddingStr = formatEmbedding(embedding);

    let sql = `
      SELECT
        c.id,
        c."sourceId",
        c.content,
        c."chunkIndex",
        c."pageNumber",
        1 - (c.embedding <=> $1::vector) AS score,
        c."createdAt"
      FROM "Chunk" c
      JOIN "Source" s ON c."sourceId" = s.id
      WHERE c.embedding IS NOT NULL
    `;

    const params: any[] = [embeddingStr];

    // Add source ID filter if provided
    if (filter?.sourceIds && filter.sourceIds.length > 0) {
      const placeholders = filter.sourceIds.map((_, i) => `$${params.length + i + 1}`).join(',');
      sql += ` AND c."sourceId" IN (${placeholders})`;
      params.push(...filter.sourceIds);
    }

    // Add minimum score filter if provided
    if (filter?.minScore !== undefined) {
      const scoreParam = params.length + 1;
      sql += ` AND (1 - (c.embedding <=> $1::vector)) >= $${scoreParam}`;
      params.push(filter.minScore);
    }

    sql += ` ORDER BY c.embedding <=> $1::vector ASC LIMIT $${params.length + 1}`;
    params.push(topK);

    const results = await prisma.$queryRawUnsafe<ScoredChunk[]>(sql, ...params);
    logger.debug(`Found ${results.length} similar chunks`);
    return results;
  } catch (error) {
    logger.error(`Failed to perform similarity search: ${error}`);
    throw error;
  }
}
