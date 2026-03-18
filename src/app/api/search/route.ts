import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { search } from '@/search/index';
import { SearchError, AuthError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { parseUserFromRequest } from '@/middleware/auth';
import { getAccessibleSources } from '@/permissions/access';
import { logAudit } from '@/storage/audit';
import { getFilteredSourceIds, filterSearchResults, summariseFilters } from '@/search/filter';
import type { SourceFilters } from '@/search/filter';
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
    folderId: z.string().optional(),
    createdBy: z.string().optional(),
    customFields: z.array(
      z.object({
        fieldName: z.string().min(1),
        value: z.string(),
      }),
    ).optional(),
  }).optional(),
});

type SearchRequest = z.infer<typeof searchRequestSchema>;

/**
 * POST /api/search
 *
 * Searches the knowledge base for documents matching the query.
 * Supports custom metadata filtering, RBAC, and audit logging.
 *
 * Response: { answer, sources, appliedFilters }
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      logger.warn('Invalid JSON in search request');
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const validation = searchRequestSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      logger.warn(`Search validation failed: ${JSON.stringify(errors)}`);
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    const validatedData = validation.data as SearchRequest;
    logger.debug(`Search request validated: query="${validatedData.query}"`);

    // ── Optional RBAC ────────────────────────────────────────────────────────
    let accessibleSourceIds: Set<string> | null = null;
    let authContext: Awaited<ReturnType<typeof parseUserFromRequest>> | null = null;

    if (request.headers.get('x-user-id')) {
      try {
        authContext = await parseUserFromRequest(request);
        const sources = await getAccessibleSources(authContext.userId, authContext.orgId);
        accessibleSourceIds = new Set(sources.map((s) => s.id));
        logger.debug(`RBAC: user ${authContext.userId} can access ${accessibleSourceIds.size} sources`);
      } catch (authErr) {
        if (authErr instanceof AuthError) {
          logger.warn(`Search auth failed: ${authErr.message}`);
          return NextResponse.json({ error: authErr.message, code: authErr.code }, { status: 401 });
        }
        throw authErr;
      }
    }

    // ── Build source filter from extended filter params ──────────────────────
    const filterInput = validatedData.filter;
    const sourceFilters: SourceFilters = {};

    if (filterInput?.type?.length)        sourceFilters.sourceType  = filterInput.type;
    if (filterInput?.folderId)            sourceFilters.folderId    = filterInput.folderId;
    if (filterInput?.createdBy)           sourceFilters.createdBy   = filterInput.createdBy;
    if (filterInput?.customFields?.length) sourceFilters.customFields = filterInput.customFields;

    if (filterInput?.dateFrom || filterInput?.dateTo) {
      sourceFilters.dateRange = {
        from: filterInput.dateFrom,
        to: filterInput.dateTo,
      };
    }

    const hasCustomFilters = Object.keys(sourceFilters).length > 0;
    let customFilteredIds: Set<string> | null = null;

    if (hasCustomFilters) {
      customFilteredIds = await getFilteredSourceIds(sourceFilters);
      logger.debug(`Custom filters matched ${customFilteredIds.size} sources`);
    }

    // ── Parse standard date filters for the search pipeline ─────────────────
    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;
    if (filterInput?.dateFrom) dateFrom = new Date(filterInput.dateFrom);
    if (filterInput?.dateTo)   dateTo   = new Date(filterInput.dateTo);

    // ── Call search pipeline ─────────────────────────────────────────────────
    const result = await search(validatedData.query, {
      sourceTypes: filterInput?.type as Prisma.SourceType[] | undefined,
      dateFrom,
      dateTo,
      limit: validatedData.limit,
    });

    // ── Post-filter by RBAC and custom filter (intersection) ─────────────────
    if (accessibleSourceIds || customFilteredIds) {
      result.sources = result.sources.filter((s) => {
        if (accessibleSourceIds && !accessibleSourceIds.has(s.sourceId)) return false;
        if (customFilteredIds && !customFilteredIds.has(s.sourceId)) return false;
        return true;
      });
    }

    logger.info(`Search: query="${validatedData.query}", sources=${result.sources.length}`);

    // ── Audit log ─────────────────────────────────────────────────────────────
    if (authContext) {
      await logAudit(
        authContext.userId,
        authContext.orgId,
        'SEARCH',
        undefined,
        {
          query: validatedData.query,
          sourceCount: result.sources.length,
          filters: summariseFilters(sourceFilters),
        },
      );
    }

    return NextResponse.json(
      {
        answer: result.answer,
        sources: result.sources,
        appliedFilters: summariseFilters(sourceFilters),
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error(`Search endpoint error: ${error}`);

    if (error instanceof SearchError) {
      if (['EMPTY_QUERY', 'SEARCH_ERROR', 'CONNECTION_ERROR', 'INVALID_RESPONSE'].includes(error.code)) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
      }
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
