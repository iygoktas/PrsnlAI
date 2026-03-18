import { Prisma, SourceType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface CreateSourceInput {
  type: SourceType;
  title: string;
  url?: string;
  filePath?: string;
  content: string;
}

export interface SourceFilter {
  type?: SourceType[];
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Creates a new source document in the database.
 * @param data Source creation input
 * @returns Newly created source with all chunks
 */
export async function createSource(data: CreateSourceInput): Promise<Prisma.SourceGetPayload<{ include: { chunks: true } }>> {
  try {
    const source = await prisma.source.create({
      data: {
        type: data.type,
        title: data.title,
        url: data.url,
        filePath: data.filePath,
        content: data.content,
      },
      include: { chunks: true },
    });
    logger.info(`Created source: ${source.id}`);
    return source;
  } catch (error) {
    logger.error(`Failed to create source: ${error}`);
    throw error;
  }
}

/**
 * Retrieves a source by ID.
 * @param id Source ID
 * @returns Source with all chunks, or null if not found
 */
export async function getSource(
  id: string,
): Promise<Prisma.SourceGetPayload<{ include: { chunks: true } }> | null> {
  try {
    const source = await prisma.source.findUnique({
      where: { id },
      include: { chunks: true },
    });
    return source;
  } catch (error) {
    logger.error(`Failed to get source ${id}: ${error}`);
    throw error;
  }
}

/**
 * Lists all sources with optional filtering.
 * @param filter Optional filters (type, date range)
 * @returns Array of sources matching filter criteria
 */
export async function listSources(
  filter?: SourceFilter,
): Promise<Array<Prisma.SourceGetPayload<{ include: { chunks: true } }>>> {
  try {
    const where: Prisma.SourceWhereInput = {};

    if (filter?.type && filter.type.length > 0) {
      where.type = { in: filter.type };
    }

    if (filter?.dateFrom || filter?.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) {
        where.createdAt!.gte = filter.dateFrom;
      }
      if (filter.dateTo) {
        where.createdAt!.lte = filter.dateTo;
      }
    }

    const sources = await prisma.source.findMany({
      where,
      include: { chunks: true },
      orderBy: { createdAt: 'desc' },
    });
    logger.info(`Listed ${sources.length} sources`);
    return sources;
  } catch (error) {
    logger.error(`Failed to list sources: ${error}`);
    throw error;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbAny = prisma as any;

/**
 * Updates the customMetadata JSON field on a source.
 * Merges with any existing metadata (new keys overwrite old ones).
 *
 * Uses `dbAny` because `customMetadata` is a new schema field that will only
 * appear in Prisma's generated types after `prisma generate` is run.
 */
export async function updateSourceMetadata(
  sourceId: string,
  customMetadata: Record<string, unknown>,
): Promise<Prisma.SourceGetPayload<object>> {
  try {
    const existing = await dbAny.source.findUnique({ where: { id: sourceId } });
    if (!existing) {
      throw new Error(`Source ${sourceId} not found`);
    }
    const merged = {
      ...(existing.customMetadata as Record<string, unknown> ?? {}),
      ...customMetadata,
    };
    const source = await dbAny.source.update({
      where: { id: sourceId },
      data: { customMetadata: merged },
    });
    logger.info(`Updated metadata for source ${sourceId}`);
    return source as Prisma.SourceGetPayload<object>;
  } catch (error) {
    logger.error(`Failed to update source metadata ${sourceId}: ${error}`);
    throw error;
  }
}

/**
 * Returns the customMetadata JSON for a source, or {} if not set.
 */
export async function getSourceMetadata(sourceId: string): Promise<Record<string, unknown>> {
  try {
    const source = await dbAny.source.findUnique({
      where: { id: sourceId },
      select: { customMetadata: true },
    });
    if (!source) {
      throw new Error(`Source ${sourceId} not found`);
    }
    return (source.customMetadata as Record<string, unknown>) ?? {};
  } catch (error) {
    logger.error(`Failed to get source metadata ${sourceId}: ${error}`);
    throw error;
  }
}

/**
 * Deletes a source and all associated chunks (cascading delete).
 * @param id Source ID
 */
export async function deleteSource(id: string): Promise<void> {
  try {
    const result = await prisma.source.delete({
      where: { id },
    });
    logger.info(`Deleted source: ${result.id}`);
  } catch (error) {
    logger.error(`Failed to delete source ${id}: ${error}`);
    throw error;
  }
}
