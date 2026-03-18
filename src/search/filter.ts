import type { Prisma, SourceType } from '@prisma/client';
import prisma from '@/lib/prisma';
import type { SearchResult } from '@/search/semantic';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CustomFieldFilter {
  /** Name of the custom field (must match a CustomField.name for the org) */
  fieldName: string;
  /** Value to match (string comparison; dates must be ISO 8601) */
  value: string;
}

export interface SourceFilters {
  /** ISO 8601 date strings bounding Source.createdAt */
  dateRange?: { from?: string; to?: string };
  /** Multiple custom-field criteria — combined with AND */
  customFields?: CustomFieldFilter[];
  /** Restrict to specific source types */
  sourceType?: string[];
  /** Restrict to a specific folder */
  folderId?: string;
  /** Restrict to sources created by a specific user (via folder.createdBy) */
  createdBy?: string;
}

// ── Filter builder ────────────────────────────────────────────────────────────

/**
 * Converts a `SourceFilters` object into a Prisma `SourceWhereInput`.
 * All provided criteria are combined with AND logic.
 *
 * Custom field values are matched via PostgreSQL JSON path queries, so they
 * require the `customMetadata` column to be populated.
 */
export function buildSourceFilter(filters: SourceFilters): Prisma.SourceWhereInput {
  const where: Prisma.SourceWhereInput = {};
  const andClauses: Prisma.SourceWhereInput[] = [];

  // ── source type ──────────────────────────────────────────────────────────
  if (filters.sourceType && filters.sourceType.length > 0) {
    where.type = { in: filters.sourceType as SourceType[] };
  }

  // ── folder ───────────────────────────────────────────────────────────────
  if (filters.folderId) {
    where.folderId = filters.folderId;
  }

  // ── date range ───────────────────────────────────────────────────────────
  if (filters.dateRange?.from || filters.dateRange?.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.dateRange.from) createdAt.gte = new Date(filters.dateRange.from);
    if (filters.dateRange.to)   createdAt.lte = new Date(filters.dateRange.to);
    where.createdAt = createdAt;
  }

  // ── createdBy: match via folder ownership ────────────────────────────────
  if (filters.createdBy) {
    andClauses.push({
      folder: { createdBy: filters.createdBy },
    });
  }

  // ── custom field filters (JSON path, AND-combined) ───────────────────────
  for (const cf of filters.customFields ?? []) {
    andClauses.push({
      customMetadata: {
        path: [cf.fieldName],
        equals: cf.value,
      },
    });
  }

  if (andClauses.length > 0) {
    where.AND = andClauses;
  }

  return where;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Executes a filter query and returns the matching source IDs as a Set.
 * Use the result to post-filter semantic search results.
 */
export async function getFilteredSourceIds(filters: SourceFilters): Promise<Set<string>> {
  const where = buildSourceFilter(filters);
  const sources = await prisma.source.findMany({
    where,
    select: { id: true },
  });
  return new Set(sources.map((s) => s.id));
}

/**
 * Removes search results whose sourceId is not in the allowed set.
 */
export function filterSearchResults(
  results: SearchResult[],
  allowedSourceIds: Set<string>,
): SearchResult[] {
  return results.filter((r) => allowedSourceIds.has(r.sourceId));
}

/**
 * Returns a human-readable summary of the applied filters, suitable
 * for including in the API response under `appliedFilters`.
 */
export function summariseFilters(filters: SourceFilters): Record<string, unknown> {
  const applied: Record<string, unknown> = {};
  if (filters.sourceType?.length)    applied.sourceType    = filters.sourceType;
  if (filters.folderId)              applied.folderId      = filters.folderId;
  if (filters.createdBy)             applied.createdBy     = filters.createdBy;
  if (filters.dateRange?.from)       applied.dateFrom      = filters.dateRange.from;
  if (filters.dateRange?.to)         applied.dateTo        = filters.dateRange.to;
  if (filters.customFields?.length)  applied.customFields  = filters.customFields;
  return applied;
}
