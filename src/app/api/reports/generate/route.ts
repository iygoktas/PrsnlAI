export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generatePdfReport } from '@/reporting/generator';
import { getReport } from '@/storage/report';
import { logAudit } from '@/storage/audit';
import { ReportError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const generateRequestSchema = z.object({
  reportId: z.string().min(1, 'reportId is required'),
  // userId would normally come from the session; accepted here for org-ownership validation
  userId: z.string().min(1, 'userId is required'),
});

/**
 * POST /api/reports/generate
 *
 * Generates a PDF for an existing report and streams it back as a file download.
 * The report must belong to the same organization as the requesting user.
 *
 * Body: { reportId: string, userId: string }
 * Response: PDF binary with Content-Disposition: attachment
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const validation = generateRequestSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    const { reportId, userId } = validation.data;

    // Ownership check: verify the report exists and user belongs to same org
    const report = await getReport(reportId);
    if (!report) {
      logger.warn(`GENERATE_REPORT: report ${reportId} not found (user: ${userId})`);
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Verify the requesting user belongs to the report's organization
    const { default: prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.orgId !== report.orgId) {
      logger.warn(`GENERATE_REPORT: user ${userId} unauthorized for report ${reportId}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    logger.info(`GENERATE_REPORT: user=${userId} report=${reportId} org=${report.orgId}`);

    const pdfBuffer = await generatePdfReport(reportId);

    await logAudit(
      userId,
      report.orgId,
      'GENERATE_REPORT',
      { id: reportId, type: 'REPORT' },
      { sourceCount: Array.isArray(report.selectedSourceIds) ? (report.selectedSourceIds as string[]).length : 0 },
    );

    const safeFilename = report.name.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error) {
    logger.error(`POST /api/reports/generate error: ${error}`);

    if (error instanceof ReportError) {
      if (error.code === 'NOT_FOUND') {
        return NextResponse.json({ error: error.message, code: error.code }, { status: 404 });
      }
      if (error.code === 'INVALID_INPUT') {
        return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
      }
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
