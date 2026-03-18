jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    source: {
      findMany: jest.fn(),
    },
  },
}));

import prisma from '@/lib/prisma';
import {
  buildSourceFilter,
  getFilteredSourceIds,
  filterSearchResults,
  summariseFilters,
} from '@/search/filter';
import type { SourceFilters } from '@/search/filter';
import type { SearchResult } from '@/search/semantic';

const mp = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => jest.clearAllMocks());

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeResult(sourceId: string): SearchResult {
  return {
    sourceId,
    title: `Doc ${sourceId}`,
    type: 'TEXT',
    excerpt: 'excerpt',
    score: 0.9,
    chunkIndex: 0,
    pageNumber: null,
    createdAt: new Date(),
  };
}

// ─── buildSourceFilter ────────────────────────────────────────────────────────

describe('buildSourceFilter()', () => {
  it('returns empty where for empty filters', () => {
    const where = buildSourceFilter({});
    expect(where).toEqual({});
  });

  it('adds sourceType filter', () => {
    const where = buildSourceFilter({ sourceType: ['PDF', 'URL'] });
    expect(where).toMatchObject({ type: { in: ['PDF', 'URL'] } });
  });

  it('adds folderId filter', () => {
    const where = buildSourceFilter({ folderId: 'f-1' });
    expect(where).toMatchObject({ folderId: 'f-1' });
  });

  it('adds dateRange.from as gte', () => {
    const where = buildSourceFilter({ dateRange: { from: '2024-01-01' } });
    expect((where.createdAt as Record<string, unknown>)?.gte).toEqual(new Date('2024-01-01'));
  });

  it('adds dateRange.to as lte', () => {
    const where = buildSourceFilter({ dateRange: { to: '2024-12-31' } });
    expect((where.createdAt as Record<string, unknown>)?.lte).toEqual(new Date('2024-12-31'));
  });

  it('adds both dateRange bounds', () => {
    const where = buildSourceFilter({ dateRange: { from: '2024-01-01', to: '2024-12-31' } });
    expect(where.createdAt).toMatchObject({
      gte: new Date('2024-01-01'),
      lte: new Date('2024-12-31'),
    });
  });

  it('adds createdBy as AND clause via folder.createdBy', () => {
    const where = buildSourceFilter({ createdBy: 'u-1' });
    expect(where.AND).toContainEqual({ folder: { createdBy: 'u-1' } });
  });

  it('adds a single custom field as AND clause', () => {
    const where = buildSourceFilter({
      customFields: [{ fieldName: 'Department', value: 'Engineering' }],
    });
    expect(where.AND).toContainEqual({
      customMetadata: { path: ['Department'], equals: 'Engineering' },
    });
  });

  it('adds multiple custom fields as separate AND clauses', () => {
    const where = buildSourceFilter({
      customFields: [
        { fieldName: 'Department', value: 'Engineering' },
        { fieldName: 'Project ID', value: 'ACME-42' },
      ],
    });
    expect((where.AND as unknown[]).length).toBe(2);
    expect(where.AND).toContainEqual({
      customMetadata: { path: ['Department'], equals: 'Engineering' },
    });
    expect(where.AND).toContainEqual({
      customMetadata: { path: ['Project ID'], equals: 'ACME-42' },
    });
  });

  it('combines sourceType, folderId, dateRange, customField together', () => {
    const filters: SourceFilters = {
      sourceType: ['PDF'],
      folderId: 'f-1',
      dateRange: { from: '2024-01-01' },
      customFields: [{ fieldName: 'Client', value: 'Acme' }],
    };
    const where = buildSourceFilter(filters);
    expect(where.type).toMatchObject({ in: ['PDF'] });
    expect(where.folderId).toBe('f-1');
    expect((where.createdAt as Record<string, unknown>)?.gte).toBeDefined();
    expect(where.AND).toBeDefined();
  });
});

// ─── getFilteredSourceIds ─────────────────────────────────────────────────────

describe('getFilteredSourceIds()', () => {
  it('returns a Set of matching source IDs', async () => {
    (mp.source.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 'src-1' },
      { id: 'src-2' },
    ]);

    const ids = await getFilteredSourceIds({ sourceType: ['PDF'] });

    expect(ids).toBeInstanceOf(Set);
    expect(ids.has('src-1')).toBe(true);
    expect(ids.has('src-2')).toBe(true);
    expect(ids.size).toBe(2);
  });

  it('returns empty Set when no sources match', async () => {
    (mp.source.findMany as jest.Mock).mockResolvedValueOnce([]);

    const ids = await getFilteredSourceIds({ folderId: 'no-folder' });
    expect(ids.size).toBe(0);
  });
});

// ─── filterSearchResults ──────────────────────────────────────────────────────

describe('filterSearchResults()', () => {
  it('keeps only results in the allowed set', () => {
    const results = [makeResult('src-1'), makeResult('src-2'), makeResult('src-3')];
    const allowed = new Set(['src-1', 'src-3']);

    const filtered = filterSearchResults(results, allowed);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((r) => r.sourceId)).toEqual(['src-1', 'src-3']);
  });

  it('returns empty array when no results are allowed', () => {
    const results = [makeResult('src-1'), makeResult('src-2')];
    const allowed = new Set<string>(['src-99']);

    expect(filterSearchResults(results, allowed)).toHaveLength(0);
  });

  it('returns all results when all are in the allowed set', () => {
    const results = [makeResult('src-1'), makeResult('src-2')];
    const allowed = new Set(['src-1', 'src-2']);

    expect(filterSearchResults(results, allowed)).toHaveLength(2);
  });
});

// ─── summariseFilters ─────────────────────────────────────────────────────────

describe('summariseFilters()', () => {
  it('returns empty object for empty filters', () => {
    expect(summariseFilters({})).toEqual({});
  });

  it('includes all active filter keys', () => {
    const summary = summariseFilters({
      sourceType: ['PDF'],
      folderId: 'f-1',
      dateRange: { from: '2024-01-01', to: '2024-12-31' },
      customFields: [{ fieldName: 'Dept', value: 'Eng' }],
      createdBy: 'u-1',
    });

    expect(summary.sourceType).toEqual(['PDF']);
    expect(summary.folderId).toBe('f-1');
    expect(summary.dateFrom).toBe('2024-01-01');
    expect(summary.dateTo).toBe('2024-12-31');
    expect(summary.customFields).toHaveLength(1);
    expect(summary.createdBy).toBe('u-1');
  });

  it('omits undefined or empty values', () => {
    const summary = summariseFilters({ sourceType: [] });
    expect(summary.sourceType).toBeUndefined();
  });
});
