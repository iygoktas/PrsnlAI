import { Report } from '@prisma/client';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ReportError } from '@/lib/errors';

export interface CreateReportInput {
  name: string;
  orgId: string;
  createdBy: string;
  selectedSourceIds: string[];
  filters?: Record<string, unknown>;
}

/**
 * Creates a new report record. Does not generate the PDF yet.
 */
export async function createReport(data: CreateReportInput): Promise<Report> {
  if (!data.name.trim()) {
    throw new ReportError('Report name cannot be empty', 'INVALID_INPUT');
  }
  if (data.selectedSourceIds.length === 0) {
    throw new ReportError('At least one source must be selected', 'INVALID_INPUT');
  }

  try {
    const report = await prisma.report.create({
      data: {
        name: data.name.trim(),
        orgId: data.orgId,
        createdBy: data.createdBy,
        selectedSourceIds: data.selectedSourceIds,
        filters: (data.filters ?? null) as never,
      },
    });
    logger.info(`Created report: ${report.id} (org: ${report.orgId})`);
    return report;
  } catch (error) {
    logger.error(`Failed to create report: ${error}`);
    throw error;
  }
}

/**
 * Retrieves a report by ID.
 */
export async function getReport(id: string): Promise<Report | null> {
  try {
    return await prisma.report.findUnique({ where: { id } });
  } catch (error) {
    logger.error(`Failed to get report ${id}: ${error}`);
    throw error;
  }
}

/**
 * Lists all reports for an organization, newest first.
 */
export async function listReports(orgId: string): Promise<Report[]> {
  try {
    const reports = await prisma.report.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
    logger.info(`Listed ${reports.length} reports (org: ${orgId})`);
    return reports;
  } catch (error) {
    logger.error(`Failed to list reports for org ${orgId}: ${error}`);
    throw error;
  }
}

/**
 * Updates the selected source IDs on an existing report.
 */
export async function updateReport(id: string, selectedSourceIds: string[]): Promise<Report> {
  if (selectedSourceIds.length === 0) {
    throw new ReportError('At least one source must be selected', 'INVALID_INPUT');
  }

  const existing = await prisma.report.findUnique({ where: { id } });
  if (!existing) {
    throw new ReportError(`Report ${id} not found`, 'NOT_FOUND');
  }

  try {
    const report = await prisma.report.update({
      where: { id },
      data: { selectedSourceIds },
    });
    logger.info(`Updated report: ${report.id}`);
    return report;
  } catch (error) {
    logger.error(`Failed to update report ${id}: ${error}`);
    throw error;
  }
}

/**
 * Deletes a report by ID.
 */
export async function deleteReport(id: string): Promise<void> {
  const existing = await prisma.report.findUnique({ where: { id } });
  if (!existing) {
    throw new ReportError(`Report ${id} not found`, 'NOT_FOUND');
  }

  try {
    await prisma.report.delete({ where: { id } });
    logger.info(`Deleted report: ${id}`);
  } catch (error) {
    logger.error(`Failed to delete report ${id}: ${error}`);
    throw error;
  }
}
