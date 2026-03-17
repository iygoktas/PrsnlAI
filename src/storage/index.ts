import { CreateSourceInput } from '@/storage/metadata';
import * as metadata from '@/storage/metadata';
import * as vector from '@/storage/vector';
import { logger } from '@/lib/logger';

export interface ChunkInput {
  content: string;
  chunkIndex: number;
  pageNumber?: number;
}

/**
 * Saves a complete document: creates the source and inserts all chunks with embeddings.
 * Implements transactional semantics: if chunk insertion fails, the source is deleted.
 * @param source Source metadata
 * @param chunks Array of chunk data (content + metadata)
 * @param embeddings 2D array of embeddings (one per chunk, must match chunk count)
 * @returns Source ID
 */
export async function saveDocument(
  source: CreateSourceInput,
  chunks: ChunkInput[],
  embeddings: number[][],
): Promise<string> {
  if (chunks.length !== embeddings.length) {
    throw new Error(
      `Chunk count mismatch: ${chunks.length} chunks but ${embeddings.length} embeddings`,
    );
  }

  // Create source first
  let sourceId: string;
  try {
    const createdSource = await metadata.createSource(source);
    sourceId = createdSource.id;
    logger.info(`Created source ${sourceId}, now inserting ${chunks.length} chunks`);
  } catch (error) {
    logger.error(`Failed to create source: ${error}`);
    throw error;
  }

  // Prepare chunks with embeddings
  const chunksWithEmbeddings = chunks.map((chunk, index) => ({
    id: `${sourceId}-chunk-${index}`,
    sourceId,
    content: chunk.content,
    chunkIndex: chunk.chunkIndex,
    pageNumber: chunk.pageNumber,
    embedding: embeddings[index],
  }));

  // Insert chunks with embeddings
  try {
    await vector.insertChunks(chunksWithEmbeddings);
    logger.info(`Successfully saved document ${sourceId} with ${chunks.length} chunks`);
    return sourceId;
  } catch (error) {
    // Rollback: delete the source if chunk insertion fails
    logger.warn(`Chunk insertion failed for source ${sourceId}, rolling back...`);
    try {
      await metadata.deleteSource(sourceId);
      logger.info(`Rolled back source ${sourceId}`);
    } catch (deleteError) {
      logger.error(`Failed to roll back source ${sourceId}: ${deleteError}`);
    }
    throw error;
  }
}
