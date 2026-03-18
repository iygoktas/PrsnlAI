jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import prisma from '@/lib/prisma';
import { logAudit, getAuditLogs, exportAuditLogs } from '@/storage/audit';

const mp = prisma as jest.Mocked<typeof prisma>;

const baseLog = {
  id: 'log-1',
  userId: 'u-1',
  orgId: 'org-1',
  action: 'SEARCH',
  resourceId: null,
  resourceType: null,
  details: { query: 'test' },
  createdAt: new Date('2024-06-01T10:00:00Z'),
};

beforeEach(() => jest.clearAllMocks());

// ─── logAudit ─────────────────────────────────────────────────────────────────

describe('logAudit()', () => {
  it('creates an audit log entry with details', async () => {
    (mp.auditLog.create as jest.Mock).mockResolvedValueOnce(baseLog);

    await logAudit('u-1', 'org-1', 'SEARCH', undefined, { query: 'test' });

    expect(mp.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'u-1',
        orgId: 'org-1',
        action: 'SEARCH',
        resourceId: null,
        resourceType: null,
        details: { query: 'test' },
      },
    });
  });

  it('creates an audit log entry with resource', async () => {
    (mp.auditLog.create as jest.Mock).mockResolvedValueOnce(baseLog);

    await logAudit('u-1', 'org-1', 'UPLOAD', { id: 'src-1', type: 'SOURCE' }, { chunks: 5 });

    expect(mp.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'u-1',
        orgId: 'org-1',
        action: 'UPLOAD',
        resourceId: 'src-1',
        resourceType: 'SOURCE',
        details: { chunks: 5 },
      },
    });
  });

  it('omits details and resource when not provided', async () => {
    (mp.auditLog.create as jest.Mock).mockResolvedValueOnce(baseLog);

    await logAudit('u-1', 'org-1', 'INGEST');

    expect(mp.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ details: null, resourceId: null, resourceType: null }),
    });
  });

  it('does not throw when DB write fails (non-fatal)', async () => {
    (mp.auditLog.create as jest.Mock).mockRejectedValueOnce(new Error('DB down'));

    // Should resolve without throwing
    await expect(logAudit('u-1', 'org-1', 'SEARCH')).resolves.toBeUndefined();
  });
});

// ─── getAuditLogs ─────────────────────────────────────────────────────────────

describe('getAuditLogs()', () => {
  it('returns logs for the org', async () => {
    (mp.auditLog.findMany as jest.Mock).mockResolvedValueOnce([baseLog]);

    const result = await getAuditLogs('org-1');

    expect(result).toHaveLength(1);
    expect(mp.auditLog.findMany).toHaveBeenCalledWith({
      where: { orgId: 'org-1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('filters by userId', async () => {
    (mp.auditLog.findMany as jest.Mock).mockResolvedValueOnce([baseLog]);

    await getAuditLogs('org-1', { userId: 'u-1' });

    expect(mp.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'u-1' }) }),
    );
  });

  it('filters by action', async () => {
    (mp.auditLog.findMany as jest.Mock).mockResolvedValueOnce([baseLog]);

    await getAuditLogs('org-1', { action: 'SEARCH' });

    expect(mp.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ action: 'SEARCH' }) }),
    );
  });

  it('filters by resourceType', async () => {
    (mp.auditLog.findMany as jest.Mock).mockResolvedValueOnce([baseLog]);

    await getAuditLogs('org-1', { resourceType: 'SOURCE' });

    expect(mp.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ resourceType: 'SOURCE' }) }),
    );
  });

  it('filters by date range', async () => {
    const dateFrom = new Date('2024-01-01');
    const dateTo = new Date('2024-12-31');
    (mp.auditLog.findMany as jest.Mock).mockResolvedValueOnce([]);

    await getAuditLogs('org-1', { dateFrom, dateTo });

    expect(mp.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { gte: dateFrom, lte: dateTo },
        }),
      }),
    );
  });

  it('returns empty array when no logs found', async () => {
    (mp.auditLog.findMany as jest.Mock).mockResolvedValueOnce([]);

    const result = await getAuditLogs('org-empty');
    expect(result).toEqual([]);
  });

  it('throws when DB query fails', async () => {
    (mp.auditLog.findMany as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

    await expect(getAuditLogs('org-1')).rejects.toThrow('DB error');
  });
});

// ─── exportAuditLogs ──────────────────────────────────────────────────────────

describe('exportAuditLogs()', () => {
  it('exports logs as JSON', async () => {
    (mp.auditLog.findMany as jest.Mock).mockResolvedValueOnce([baseLog]);

    const buffer = await exportAuditLogs('org-1', 'json');
    const parsed = JSON.parse(buffer.toString('utf-8'));

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].action).toBe('SEARCH');
  });

  it('exports logs as CSV', async () => {
    (mp.auditLog.findMany as jest.Mock).mockResolvedValueOnce([baseLog]);

    const buffer = await exportAuditLogs('org-1', 'csv');
    const csv = buffer.toString('utf-8');

    expect(csv).toContain('id,userId,orgId,action');
    expect(csv).toContain('SEARCH');
    expect(csv).toContain('u-1');
  });

  it('CSV includes all expected columns', async () => {
    (mp.auditLog.findMany as jest.Mock).mockResolvedValueOnce([baseLog]);

    const buffer = await exportAuditLogs('org-1', 'csv');
    const lines = buffer.toString('utf-8').split('\n');
    const headerLine = lines[0];

    expect(headerLine).toContain('resourceId');
    expect(headerLine).toContain('resourceType');
    expect(headerLine).toContain('createdAt');
  });

  it('returns empty JSON array when no logs', async () => {
    (mp.auditLog.findMany as jest.Mock).mockResolvedValueOnce([]);

    const buffer = await exportAuditLogs('org-1', 'json');
    expect(JSON.parse(buffer.toString('utf-8'))).toEqual([]);
  });

  it('returns CSV with only header when no logs', async () => {
    (mp.auditLog.findMany as jest.Mock).mockResolvedValueOnce([]);

    const buffer = await exportAuditLogs('org-1', 'csv');
    const lines = buffer.toString('utf-8').split('\n').filter(Boolean);
    expect(lines).toHaveLength(1); // header only
  });

  it('escapes commas in CSV values', async () => {
    const logWithComma = { ...baseLog, action: 'UPLOAD,TEST' };
    (mp.auditLog.findMany as jest.Mock).mockResolvedValueOnce([logWithComma]);

    const buffer = await exportAuditLogs('org-1', 'csv');
    expect(buffer.toString('utf-8')).toContain('"UPLOAD,TEST"');
  });
});
