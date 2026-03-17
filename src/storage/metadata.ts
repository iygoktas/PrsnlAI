import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface CreateSourceInput {
  type: Prisma.SourceType;
  title: string;
  url?: string;
  filePath?: string;
  content: string;
}

export interface SourceFilter {
  type?: Prisma.SourceType[];
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
