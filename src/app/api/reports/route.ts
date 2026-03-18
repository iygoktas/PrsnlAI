export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createReport, listReports } from '@/storage/report';
import { ReportError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const createReportSchema = z.object({
  name: z.string().min(1, 'name is required'),
  orgId: z.string().min(1, 'orgId is required'),
  // In production this would come from the session; we accept it in the body for now
  createdBy: z.string().min(1, 'createdBy is required'),
  selectedSourceIds: z.array(z.string()).min(1, 'At least one source must be selected'),
  filters: z.record(z.string(), z.unknown()).optional(),
});

/**
 * GET /api/reports?orgId=<orgId>
 *
 * Returns all reports for the given organization.
 * Response: { reports: Array<{ id, name, createdBy, selectedSourceIds, createdAt }> }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId query parameter is required' }, { status: 400 });
    }

    const reports = await listReports(orgId);

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r.id,
        name: r.name,
        createdBy: r.createdBy,
        selectedSourceIds: r.selectedSourceIds,
        generatedAt: r.generatedAt,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    logger.error(`GET /api/reports error: ${error}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/reports
 *
 * Creates a new report (without generating the PDF).
 * Body: { name, orgId, createdBy, selectedSourceIds, filters? }
 * Response: { id, name, createdBy, selectedSourceIds, createdAt }
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const validation = createReportSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    const data = validation.data;
    const report = await createReport(data);

    logger.info(`POST /api/reports: created report ${report.id} for org ${report.orgId}`);

    return NextResponse.json(
      {
        id: report.id,
        name: report.name,
        createdBy: report.createdBy,
        selectedSourceIds: report.selectedSourceIds,
        generatedAt: report.generatedAt,
        createdAt: report.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error(`POST /api/reports error: ${error}`);

    if (error instanceof ReportError && error.code === 'INVALID_INPUT') {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
