import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface AuditLogRecord {
  id: string;
  userId: string;
  orgId: string;
  action: string;
  resourceId: string | null;
  resourceType: string | null;
  details: unknown;
  createdAt: Date;
}

/**
 * Writes an audit log entry. Failures are non-fatal and only emit a warning.
 *
 * @param userId    The user performing the action
 * @param orgId     The organization context
 * @param action    A constant string identifying the action (e.g. 'SEARCH', 'INGEST', 'GENERATE_REPORT')
 * @param resource  Optional resource being acted upon { id, type }
 * @param details   Optional structured details (query text, counts, etc.)
 */
export async function logAudit(
  userId: string,
  orgId: string,
  action: string,
  resource?: { id: string; type: string },
  details?: object,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        orgId,
        action,
        resourceId: resource?.id ?? null,
        resourceType: resource?.type ?? null,
        details: (details ?? null) as never,
      },
    });
    logger.debug(`Audit: [${action}] user=${userId} org=${orgId}`);
  } catch (error) {
    // Audit log failures must never interrupt the main operation
    logger.warn(`Failed to write audit log (action=${action}): ${error}`);
  }
}

/**
 * Retrieves audit log entries for an organization with optional filtering.
 */
export async function getAuditLogs(
  orgId: string,
  filters?: AuditLogFilters,
): Promise<AuditLogRecord[]> {
  try {
    const where: Record<string, unknown> = { orgId };

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.action) where.action = filters.action;
    if (filters?.resourceType) where.resourceType = filters.resourceType;

    if (filters?.dateFrom || filters?.dateTo) {
      const createdAt: Record<string, Date> = {};
      if (filters.dateFrom) createdAt.gte = filters.dateFrom;
      if (filters.dateTo) createdAt.lte = filters.dateTo;
      where.createdAt = createdAt;
    }

    return prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    }) as Promise<AuditLogRecord[]>;
  } catch (error) {
    logger.error(`Failed to get audit logs for org ${orgId}: ${error}`);
    throw error;
  }
}

/**
 * Exports audit logs for an organization in JSON or CSV format.
 *
 * @param orgId   The organization to export logs for
 * @param format  Output format: 'json' or 'csv'
 * @returns Buffer containing the serialized audit logs
 */
export async function exportAuditLogs(
  orgId: string,
  format: 'json' | 'csv',
): Promise<Buffer> {
  const logs = await getAuditLogs(orgId);

  if (format === 'json') {
    return Buffer.from(JSON.stringify(logs, null, 2), 'utf-8');
  }

  // CSV format
  const headers = ['id', 'userId', 'orgId', 'action', 'resourceId', 'resourceType', 'details', 'createdAt'];
  const rows = logs.map((log) => [
    log.id,
    log.userId,
    log.orgId,
    log.action,
    log.resourceId ?? '',
    log.resourceType ?? '',
    log.details ? JSON.stringify(log.details) : '',
    log.createdAt.toISOString(),
  ]);

  const escapeCsv = (val: string) =>
    val.includes(',') || val.includes('"') || val.includes('\n')
      ? `"${val.replace(/"/g, '""')}"`
      : val;

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\n');

  return Buffer.from(csv, 'utf-8');
}
