import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { search } from '@/search/index';
import { SearchError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';

/**
 * Zod schema for validating search API requests.
 */
const searchRequestSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  limit: z.number().int().positive().optional(),
  filter: z.object({
    type: z.array(z.enum(['URL', 'PDF', 'TEXT', 'TWEET'])).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  }).optional(),
});

type SearchRequest = z.infer<typeof searchRequestSchema>;

/**
 * POST /api/search
 *
 * Searches the knowledge base for documents matching the query.
 * Performs semantic search, reranking, and LLM answer generation.
 *
 * @param request Next.js request object
 * @returns JSON response with answer and supporting sources
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      logger.warn('Invalid JSON in search request');
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 },
      );
    }

    // Validate request with Zod
    const validation = searchRequestSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      logger.warn(`Search validation failed: ${JSON.stringify(errors)}`);
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 },
      );
    }

    const validatedData = validation.data as SearchRequest;
    logger.debug(`Search request validated: query="${validatedData.query}"`);

    // Parse ISO 8601 dates if provided
    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;
    if (validatedData.filter?.dateFrom) {
      dateFrom = new Date(validatedData.filter.dateFrom);
    }
    if (validatedData.filter?.dateTo) {
      dateTo = new Date(validatedData.filter.dateTo);
    }

    // Call search pipeline
    const result = await search(validatedData.query, {
      sourceTypes: validatedData.filter?.type as Prisma.SourceType[] | undefined,
      dateFrom,
      dateTo,
      limit: validatedData.limit,
    });

    logger.info(
      `Search successful: query="${validatedData.query}", sources=${result.sources.length}`,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logger.error(`Search endpoint error: ${error}`);

    // Map SearchError to HTTP status codes
    if (error instanceof SearchError) {
      // 422 for search-specific failures
      if (
        [
          'EMPTY_QUERY',
          'SEARCH_ERROR',
          'CONNECTION_ERROR',
          'INVALID_RESPONSE',
        ].includes(error.code)
      ) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: 422 },
        );
      }

      // Default to 500 for other SearchErrors
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 },
      );
    }

    // Default to 500 for unexpected errors
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
