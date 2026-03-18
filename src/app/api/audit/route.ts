export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuditLogs, exportAuditLogs } from '@/storage/audit';
import { parseUserFromRequest, validateRole } from '@/middleware/auth';
import { AuthError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * GET /api/audit
 *
 * Returns paginated audit logs for the requesting user's organization.
 * Only ADMIN users can access this endpoint.
 *
 * Query params:
 *   - limit    (default 50)
 *   - offset   (default 0)
 *   - action   filter by action string
 *   - userId   filter by user
 *   - dateFrom ISO 8601
 *   - dateTo   ISO 8601
 */
export async function GET(request: NextRequest) {
  try {
    // ── Auth: ADMIN only ──────────────────────────────────────────────────────
    let authContext: Awaited<ReturnType<typeof parseUserFromRequest>>;
    try {
      authContext = await parseUserFromRequest(request);
    } catch (authErr) {
      if (authErr instanceof AuthError) {
        return NextResponse.json({ error: authErr.message, code: authErr.code }, { status: 401 });
      }
      throw authErr;
    }

    if (!validateRole(authContext.role, ['ADMIN'])) {
      logger.warn(`GET /api/audit forbidden: user ${authContext.userId} role ${authContext.role}`);
      return NextResponse.json({ error: 'Forbidden: ADMIN role required' }, { status: 403 });
    }

    // ── Parse query params ────────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);
    const action = searchParams.get('action') ?? undefined;
    const userId = searchParams.get('userId') ?? undefined;
    const dateFromStr = searchParams.get('dateFrom');
    const dateToStr = searchParams.get('dateTo');
    const resourceType = searchParams.get('resourceType') ?? undefined;

    const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
    const dateTo = dateToStr ? new Date(dateToStr) : undefined;

    if (dateFrom && isNaN(dateFrom.getTime())) {
      return NextResponse.json({ error: 'Invalid dateFrom' }, { status: 400 });
    }
    if (dateTo && isNaN(dateTo.getTime())) {
      return NextResponse.json({ error: 'Invalid dateTo' }, { status: 400 });
    }

    // ── Fetch logs ────────────────────────────────────────────────────────────
    const allLogs = await getAuditLogs(authContext.orgId, {
      userId,
      action,
      resourceType,
      dateFrom,
      dateTo,
    });

    const paginated = allLogs.slice(offset, offset + limit);

    return NextResponse.json({
      logs: paginated,
      total: allLogs.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.error(`GET /api/audit error: ${error}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const exportSchema = z.object({
  format: z.enum(['json', 'csv']),
  filters: z
    .object({
      userId: z.string().optional(),
      action: z.string().optional(),
      resourceType: z.string().optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
    })
    .optional(),
});

/**
 * POST /api/audit/export
 *
 * Exports audit logs as a downloadable file (JSON or CSV).
 * Only ADMIN users can export.
 *
 * Body: { format: 'json' | 'csv', filters?: object }
 */
export async function POST(request: NextRequest) {
  try {
    // ── Auth: ADMIN only ──────────────────────────────────────────────────────
    let authContext: Awaited<ReturnType<typeof parseUserFromRequest>>;
    try {
      authContext = await parseUserFromRequest(request);
    } catch (authErr) {
      if (authErr instanceof AuthError) {
        return NextResponse.json({ error: authErr.message, code: authErr.code }, { status: 401 });
      }
      throw authErr;
    }

    if (!validateRole(authContext.role, ['ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden: ADMIN role required' }, { status: 403 });
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const validation = exportSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    const { format, filters } = validation.data;

    // Export all matching logs (no pagination for export)
    const buffer = await exportAuditLogs(authContext.orgId, format);

    const contentType = format === 'json' ? 'application/json' : 'text/csv';
    const filename = `audit-logs-${authContext.orgId}-${new Date().toISOString().slice(0, 10)}.${format}`;

    logger.info(`Audit export: org=${authContext.orgId} format=${format} user=${authContext.userId}`);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    logger.error(`POST /api/audit/export error: ${error}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
