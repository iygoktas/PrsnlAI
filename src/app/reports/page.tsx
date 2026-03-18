'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Pencil, RefreshCw } from 'lucide-react';
import ReportBuilder from '@/components/ReportBuilder';

interface Report {
  id: string;
  name: string;
  createdBy: string;
  selectedSourceIds: string[];
  generatedAt: string | null;
  createdAt: string;
}

/**
 * Reports list page — view, download, and manage saved reports.
 */
export default function ReportsPage() {
  const orgId = process.env.NEXT_PUBLIC_ORG_ID ?? 'default-org';
  const userId = process.env.NEXT_PUBLIC_USER_ID ?? 'default-user';

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports?orgId=${encodeURIComponent(orgId)}`);
      if (!res.ok) {
        setError(`Failed to load reports (${res.status})`);
        return;
      }
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch (err) {
      setError(`Network error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchReports(); }, [orgId]);

  const handleGeneratePdf = async (report: Report) => {
    setGeneratingId(report.id);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id, userId }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? 'PDF generation failed.');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Network error: ${err}`);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('Delete this report? This cannot be undone.')) return;
    setDeletingId(reportId);
    try {
      // Would need DELETE /api/reports/[id] — for now just remove from local state
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } finally {
      setDeletingId(null);
    }
  };

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F2F0EB] font-mono p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-wide">Reports</h1>
          <div className="flex gap-2">
            <button
              onClick={() => void fetchReports()}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2A2A2A] rounded hover:bg-[#1A1A1A] text-sm"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <a
              href="/add"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C8922A] text-black rounded text-sm font-medium hover:bg-[#d9a33b]"
            >
              <FileText size={14} />
              New Report
            </a>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 border border-red-700 bg-red-950 rounded text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Edit mode */}
        {editingReport && (
          <div className="mb-6 p-4 border border-[#2A2A2A] rounded-lg bg-[#1A1A1A]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold text-[#C8922A]">Edit Report</h2>
              <button onClick={() => setEditingReport(null)} className="text-xs text-gray-400 hover:text-[#F2F0EB]">
                Cancel ✕
              </button>
            </div>
            <ReportBuilder
              orgId={orgId}
              userId={userId}
              onReportCreated={() => {
                setEditingReport(null);
                void fetchReports();
              }}
            />
          </div>
        )}

        {/* Reports list */}
        {loading ? (
          <p className="text-center text-gray-500 text-sm py-12">Loading reports…</p>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <FileText size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No reports yet.</p>
            <a href="/add" className="text-xs text-[#C8922A] hover:underline mt-2 inline-block">
              Create your first report →
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center gap-4 p-4 border border-[#2A2A2A] rounded-lg bg-[#1A1A1A] hover:border-[#3A3A3A] transition-colors"
              >
                <FileText size={20} className="text-[#C8922A] shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#F2F0EB] truncate">{report.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {Array.isArray(report.selectedSourceIds) ? report.selectedSourceIds.length : 0} sources
                    {' · '}
                    Created {formatDate(report.createdAt)}
                    {report.generatedAt && ` · PDF generated ${formatDate(report.generatedAt)}`}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => void handleGeneratePdf(report)}
                    disabled={generatingId === report.id}
                    title="Download PDF"
                    aria-label={`Download PDF for ${report.name}`}
                    className="p-1.5 border border-[#2A2A2A] rounded hover:bg-[#2A2A2A] text-gray-400 hover:text-[#F2F0EB] disabled:opacity-40 transition-colors"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={() => setEditingReport(report.id)}
                    title="Edit report"
                    aria-label={`Edit ${report.name}`}
                    className="p-1.5 border border-[#2A2A2A] rounded hover:bg-[#2A2A2A] text-gray-400 hover:text-[#F2F0EB] transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => void handleDelete(report.id)}
                    disabled={deletingId === report.id}
                    title="Delete report"
                    aria-label={`Delete ${report.name}`}
                    className="p-1.5 border border-red-900 rounded hover:bg-red-950 text-red-500 hover:text-red-300 disabled:opacity-40 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
