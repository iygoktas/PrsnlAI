'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, Filter, X } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  userId: string;
  orgId: string;
  action: string;
  resourceId: string | null;
  resourceType: string | null;
  details: unknown;
  createdAt: string;
}

interface AuditLogViewerProps {
  userId: string; // must be ADMIN
}

const ACTION_COLORS: Record<string, string> = {
  UPLOAD: 'bg-green-900 text-green-200',
  SEARCH: 'bg-blue-900 text-blue-200',
  GENERATE_REPORT: 'bg-amber-900 text-amber-200',
  DELETE: 'bg-red-900 text-red-200',
  READ: 'bg-gray-700 text-gray-300',
  INGEST_FORBIDDEN: 'bg-red-900 text-red-300',
};

function actionBadgeClass(action: string) {
  return ACTION_COLORS[action] ?? 'bg-gray-700 text-gray-300';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AuditLogViewer({ userId }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(0);
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(page * limit));
      if (actionFilter) params.set('action', actionFilter);
      if (userFilter) params.set('userId', userFilter);
      if (dateFrom) params.set('dateFrom', new Date(dateFrom).toISOString());
      if (dateTo) params.set('dateTo', new Date(dateTo).toISOString());

      const res = await fetch(`/api/audit?${params.toString()}`, {
        headers: { 'x-user-id': userId },
      });

      if (res.status === 403) {
        setError('Access denied — ADMIN role required.');
        return;
      }
      if (!res.ok) {
        setError(`Failed to load logs (${res.status})`);
        return;
      }

      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(`Network error: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [userId, page, actionFilter, userFilter, dateFrom, dateTo]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const res = await fetch('/api/audit/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ format }),
      });

      if (!res.ok) {
        setError(`Export failed (${res.status})`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Export error: ${err}`);
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setActionFilter('');
    setUserFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  const hasFilters = actionFilter || userFilter || dateFrom || dateTo;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="font-mono text-sm bg-[#0D0D0D] text-[#F2F0EB] min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-wide">Audit Logs</h1>
          <p className="text-gray-400 text-xs mt-1">KVKK compliance — {total} entries</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2A2A2A] rounded hover:bg-[#1A1A1A] transition-colors"
          >
            <Filter size={14} />
            Filters {hasFilters && <span className="text-[#C8922A]">●</span>}
          </button>
          <button
            onClick={() => void fetchLogs()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2A2A2A] rounded hover:bg-[#1A1A1A] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => void handleExport('csv')}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C8922A] text-black rounded hover:bg-[#d9a33b] transition-colors disabled:opacity-50"
          >
            <Download size={14} />
            CSV
          </button>
          <button
            onClick={() => void handleExport('json')}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#C8922A] text-[#C8922A] rounded hover:bg-[#1A1A1A] transition-colors disabled:opacity-50"
          >
            <Download size={14} />
            JSON
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-4 p-4 border border-[#2A2A2A] rounded-lg bg-[#1A1A1A]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Action</label>
              <input
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
                placeholder="e.g. SEARCH"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#C8922A]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">User ID</label>
              <input
                value={userFilter}
                onChange={(e) => { setUserFilter(e.target.value); setPage(0); }}
                placeholder="user ID"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#C8922A]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#C8922A]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#C8922A]"
              />
            </div>
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-[#F2F0EB]"
            >
              <X size={12} /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 border border-red-700 bg-red-950 rounded text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-[#2A2A2A] rounded-lg">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#2A2A2A] bg-[#1A1A1A] text-gray-400">
              <th className="text-left px-3 py-2">Timestamp</th>
              <th className="text-left px-3 py-2">User</th>
              <th className="text-left px-3 py-2">Action</th>
              <th className="text-left px-3 py-2">Resource</th>
              <th className="text-left px-3 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                  No audit logs found.
                </td>
              </tr>
            )}
            {!loading &&
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A] transition-colors"
                >
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-[#F2F0EB] truncate max-w-[140px]" title={log.userId}>
                    {log.userId}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-400 truncate max-w-[160px]">
                    {log.resourceType && (
                      <span className="text-gray-500">{log.resourceType}/</span>
                    )}
                    {log.resourceId ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-400 truncate max-w-[240px]">
                    {log.details ? (
                      <span title={JSON.stringify(log.details)}>
                        {JSON.stringify(log.details).slice(0, 80)}
                        {JSON.stringify(log.details).length > 80 && '…'}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border border-[#2A2A2A] rounded hover:bg-[#1A1A1A] disabled:opacity-30"
          >
            ← Prev
          </button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border border-[#2A2A2A] rounded hover:bg-[#1A1A1A] disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
