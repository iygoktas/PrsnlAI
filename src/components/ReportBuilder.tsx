'use client';

import React, { useState, useCallback } from 'react';
import { FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import SourceSelector from './SourceSelector';

interface ReportBuilderProps {
  orgId: string;
  userId: string;
  onReportCreated?: (reportId: string) => void;
}

export default function ReportBuilder({ orgId, userId, onReportCreated }: ReportBuilderProps) {
  const [reportName, setReportName] = useState('');
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [createdReportId, setCreatedReportId] = useState<string | null>(null);

  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedSourceIds(ids);
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreateReport = async () => {
    if (!reportName.trim()) {
      showToast('error', 'Report name is required.');
      return;
    }
    if (selectedSourceIds.length === 0) {
      showToast('error', 'Select at least one document.');
      return;
    }

    setIsCreating(true);
    try {
      const filters: Record<string, string> = {};
      if (dateFrom) filters.dateFrom = new Date(dateFrom).toISOString();
      if (dateTo) filters.dateTo = new Date(dateTo).toISOString();

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reportName.trim(),
          orgId,
          createdBy: userId,
          selectedSourceIds,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast('error', err.error ?? 'Failed to create report.');
        return;
      }

      const report = await res.json();
      setCreatedReportId(report.id);
      showToast('success', `Report "${report.name}" created (${selectedSourceIds.length} documents).`);
      onReportCreated?.(report.id);
    } catch (err) {
      showToast('error', `Network error: ${err}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!createdReportId) {
      showToast('error', 'Create the report first before generating a PDF.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: createdReportId, userId }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast('error', err.error ?? 'PDF generation failed.');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', 'PDF downloaded successfully.');
    } catch (err) {
      showToast('error', `Network error: ${err}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const estimatedPdfSize = Math.ceil(selectedSourceIds.length * 2.5); // rough KB estimate

  return (
    <div className="flex flex-col gap-5 text-[#F2F0EB] font-mono">
      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded border text-xs
            ${toast.type === 'success'
              ? 'bg-green-950 border-green-700 text-green-200'
              : 'bg-red-950 border-red-700 text-red-200'}`}
        >
          {toast.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {toast.message}
        </div>
      )}

      {/* Report name */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Report Name</label>
        <input
          type="text"
          value={reportName}
          onChange={(e) => setReportName(e.target.value)}
          placeholder="e.g. Q2 2024 Research"
          aria-label="Report name"
          className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#C8922A]"
        />
      </div>

      {/* Source selector */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Select Documents</label>
        <SourceSelector orgId={orgId} onSelectionChange={handleSelectionChange} />
      </div>

      {/* Date filter */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Filter by Date (optional)</label>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#C8922A]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#C8922A]"
            />
          </div>
        </div>
      </div>

      {/* Preview summary */}
      {selectedSourceIds.length > 0 && (
        <div className="p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-xs text-gray-400">
          <div className="flex justify-between">
            <span>{selectedSourceIds.length} document{selectedSourceIds.length !== 1 ? 's' : ''} will be in report</span>
            <span>~{estimatedPdfSize} KB</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => void handleCreateReport()}
          disabled={isCreating || !reportName.trim() || selectedSourceIds.length === 0}
          aria-label="Create report"
          className="flex items-center gap-2 px-4 py-2 bg-[#C8922A] text-black rounded font-medium text-sm hover:bg-[#d9a33b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          {isCreating ? 'Creating…' : 'Create Report'}
        </button>

        {createdReportId && (
          <button
            onClick={() => void handleGeneratePdf()}
            disabled={isGenerating}
            aria-label="Generate PDF"
            className="flex items-center gap-2 px-4 py-2 border border-[#C8922A] text-[#C8922A] rounded font-medium text-sm hover:bg-[#1A1A1A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {isGenerating ? 'Generating…' : 'Download PDF'}
          </button>
        )}
      </div>
    </div>
  );
}
