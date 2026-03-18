'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Pencil, RefreshCw, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ReportBuilder from '@/components/ReportBuilder';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/context/AuthContext';

interface Report {
  id: string;
  name: string;
  createdBy: string;
  selectedSourceIds: string[];
  generatedAt: string | null;
  createdAt: string;
}

export default function ReportsPage() {
  const { user, isLoading } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<string | null>(null);
  const [showNewBuilder, setShowNewBuilder] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const fetchReports = async (orgId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports?orgId=${encodeURIComponent(orgId)}`);
      if (!res.ok) { setError(`Failed to load reports (${res.status})`); return; }
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch (err) {
      setError(`Network error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) void fetchReports(user.orgId);
  }, [user]);

  if (isLoading) return null;
  if (!user) return <AuthModal />;

  const handleGeneratePdf = async (report: Report) => {
    setGeneratingId(report.id);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id, userId: user.userId }),
      });
      if (!res.ok) { alert((await res.json()).error ?? 'PDF generation failed.'); return; }
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

  const handleDelete = (reportId: string) => {
    if (!confirm('Delete this report? This cannot be undone.')) return;
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={16} />
            </Link>
            <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Reports</h1>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => void fetchReports(user.orgId)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button onClick={() => { setShowNewBuilder(true); setEditingReport(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent)', color: '#000', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit' }}>
              <Plus size={13} />
              New Report
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.1)', fontSize: '13px', color: '#f87171' }}>
            {error}
          </div>
        )}

        {/* New Report Builder */}
        {showNewBuilder && (
          <div style={{ marginBottom: '24px', padding: '24px', border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>New Report</h2>
              <button onClick={() => setShowNewBuilder(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px', lineHeight: 1, padding: 0 }}>×</button>
            </div>
            <ReportBuilder orgId={user.orgId} userId={user.userId}
              onReportCreated={() => { setShowNewBuilder(false); void fetchReports(user.orgId); }} />
          </div>
        )}

        {/* Edit Report Builder */}
        {editingReport && (
          <div style={{ marginBottom: '24px', padding: '24px', border: '1px solid var(--accent)', borderRadius: '12px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--accent)' }}>Edit Report</h2>
              <button onClick={() => setEditingReport(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px', lineHeight: 1, padding: 0 }}>×</button>
            </div>
            <ReportBuilder orgId={user.orgId} userId={user.userId}
              onReportCreated={() => { setEditingReport(null); void fetchReports(user.orgId); }} />
          </div>
        )}

        {/* Reports list */}
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', padding: '48px 0' }}>Loading reports…</p>
        ) : reports.length === 0 && !showNewBuilder ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: '14px', margin: '0 0 8px' }}>No reports yet.</p>
            <button onClick={() => setShowNewBuilder(true)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', padding: 0 }}>
              Create your first report →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reports.map((report) => (
              <div key={report.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', border: '1px solid var(--border)', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', transition: 'border-color 150ms ease' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-dim)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}>
                <FileText size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.name}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                    {Array.isArray(report.selectedSourceIds) ? report.selectedSourceIds.length : 0} sources · {formatDate(report.createdAt)}
                    {report.generatedAt && ` · PDF ${formatDate(report.generatedAt)}`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button onClick={() => void handleGeneratePdf(report)} disabled={generatingId === report.id} title="Download PDF"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '6px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 150ms ease' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}>
                    <Download size={13} />
                  </button>
                  <button onClick={() => setEditingReport(report.id)} title="Edit"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '6px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 150ms ease' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(report.id)} title="Delete"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '6px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 150ms ease' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--error)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--error)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}>
                    <Trash2 size={13} />
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
